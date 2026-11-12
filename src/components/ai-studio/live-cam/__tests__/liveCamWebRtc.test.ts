import { describe, expect, it, vi } from 'vitest';
import {
  LiveCamRtcLink,
  canUseWebRtc,
  cleanIceServers,
  drawRemoteFrames,
  formatRtcLine,
  orderCodecs,
  summarizeRtcStats,
  type RtcLinkDeps,
  type RtcLinkOptions,
} from '../liveCamWebRtc';
import { LIVE_CAM_DEFAULT_WEBRTC_TEST, liveCamEndpoint, liveCamTransport, withEndpointRoute } from '../liveCamFlags';

const CF = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
  { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
];

describe('ICE servers, codecs, support', () => {
  it('keeps stun/turn/turns URLs with credentials, drops port 53 and junk', () => {
    expect(cleanIceServers(CF)).toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
    ]);
    expect(cleanIceServers([{ urls: ['turn:t:3478?transport=udp'] }])).toEqual([]); // TURN without credentials
    expect(cleanIceServers('x')).toEqual([]);
    expect(cleanIceServers([null, { urls: 'http://x' }])).toEqual([]);
  });

  it('puts H.264 first', () => {
    const order = orderCodecs([{ mimeType: 'video/VP8' }, { mimeType: 'video/H264' }, { mimeType: 'video/rtx' }]).map((c) => c.mimeType);
    expect(order).toEqual(['video/H264', 'video/VP8', 'video/rtx']);
  });

  it('needs RTCPeerConnection, MediaStreamTrackProcessor and createImageBitmap', () => {
    const f = () => undefined;
    expect(canUseWebRtc({ RTCPeerConnection: f, MediaStreamTrackProcessor: f, createImageBitmap: f })).toBe(true);
    expect(canUseWebRtc({ RTCPeerConnection: f, createImageBitmap: f })).toBe(false); // Safari: stays on JPEG
    expect(canUseWebRtc({})).toBe(false);
  });

  it('one constant sets both defaults (owner, 12 Nov: WebRTC through the test path for everyone)', () => {
    const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
    expect(LIVE_CAM_DEFAULT_WEBRTC_TEST).toBe(true);
    expect(liveCamEndpoint('', mem())).toBe(LIVE_CAM_DEFAULT_WEBRTC_TEST ? 'test' : 'live');
    expect(liveCamTransport('', mem(), {})).toBe(LIVE_CAM_DEFAULT_WEBRTC_TEST ? 'webrtc' : 'ws');
    expect(liveCamEndpoint('?livecam_endpoint=nonsense', mem())).toBe('test'); // junk = the default
  });

  it('endpoint switch: the device can choose live or test, remembered', () => {
    const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
    const s = mem();
    expect(liveCamEndpoint('?livecam_endpoint=live', s)).toBe('live');
    expect(liveCamEndpoint('', s)).toBe('live'); // remembered on the device
    expect(liveCamEndpoint('?livecam_endpoint=test', s)).toBe('test');
    expect(liveCamEndpoint('', s)).toBe('test');
    const live = 'wss://fluxrt-orchestrator.acct.workers.dev/ws?token=abc';
    expect(withEndpointRoute(live, 'test')).toBe('wss://fluxrt-orchestrator-test.acct.workers.dev/ws?token=abc');
    expect(withEndpointRoute(live, 'live')).toBe(live);
    expect(withEndpointRoute('wss://other.example/ws?token=abc', 'test')).toBe('wss://other.example/ws?token=abc'); // only our Worker host
  });

  it('transport switch: the device can choose ws or webrtc, remembered; the build env can too', () => {
    const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
    const s = mem();
    expect(liveCamTransport('?livecam_transport=ws', s, {})).toBe('ws');
    expect(liveCamTransport('', s, {})).toBe('ws'); // remembered on the device: the manual way back
    expect(liveCamTransport('?livecam_transport=webrtc', s, {})).toBe('webrtc');
    expect(liveCamTransport('', s, {})).toBe('webrtc');
    expect(liveCamTransport('', mem(), { VITE_LIVE_CAM_TRANSPORT: 'ws' })).toBe('ws');
  });
});

function fakeTrack(settings = { width: 288, height: 512 }) {
  const clones: Array<Record<string, unknown>> = [];
  const make = (): Record<string, unknown> => {
    const t: Record<string, unknown> = {
      kind: 'video',
      contentHint: '',
      stopped: false,
      constraints: null as unknown,
      applyConstraints: vi.fn(async (c: unknown) => { t.constraints = c; }),
      getSettings: () => settings,
      stop: vi.fn(() => { t.stopped = true; }),
      clone: () => { const c = make(); clones.push(c); return c; },
    };
    return t;
  };
  return { track: make() as unknown as MediaStreamTrack, clones };
}

function fakePc() {
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  const params = { encodings: [{ maxFramerate: 10 }] } as Record<string, unknown>;
  const sender = {
    getParameters: () => params,
    setParameters: vi.fn(async () => undefined),
    replaceTrack: vi.fn(async () => undefined),
  };
  const transceiver = { sender, setCodecPreferences: vi.fn() };
  const pc = {
    iceGatheringState: 'complete',
    connectionState: 'new',
    localDescription: null as null | { sdp: string },
    addEventListener: (ev: string, fn: (e: unknown) => void) => { (listeners[ev] ??= []).push(fn); },
    addTransceiver: vi.fn(() => transceiver),
    createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'v=0 offer' })),
    setLocalDescription: vi.fn(async (d: { sdp: string }) => { pc.localDescription = d; }),
    setRemoteDescription: vi.fn(async () => undefined),
    getStats: vi.fn(async () => new Map()),
    close: vi.fn(),
    emit: (ev: string, e: unknown = {}) => (listeners[ev] ?? []).forEach((fn) => fn(e)),
  };
  return { pc, sender, transceiver, params };
}

function setup(over: Partial<RtcLinkOptions> = {}, settings?: { width: number; height: number }) {
  const { track, clones } = fakeTrack(settings);
  const { pc, sender, transceiver, params } = fakePc();
  const sent: Array<Record<string, unknown>> = [];
  const timers: Array<{ fn: () => void; ms: number; cleared: boolean }> = [];
  const deps: RtcLinkDeps = {
    makePeerConnection: vi.fn(() => pc as unknown as RTCPeerConnection),
    getCodecs: () => [{ mimeType: 'video/VP8' }, { mimeType: 'video/H264' }],
    setTimer: (fn, ms) => { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
    clearTimer: (t) => { if (t) (t as { cleared: boolean }).cleared = true; },
    now: () => 0,
  };
  const calls = { connected: 0, failed: [] as string[], remote: 0 };
  const opts: RtcLinkOptions = {
    cameraTrack: track, width: 288, height: 512, fps: 10, iceServers: cleanIceServers(CF),
    send: (m) => sent.push(m),
    onRemoteTrack: () => { calls.remote += 1; },
    onConnected: () => { calls.connected += 1; },
    onFailed: (r) => { calls.failed.push(r); },
    ...over,
  };
  const link = new LiveCamRtcLink(opts, deps);
  return { link, pc, sender, transceiver, params, sent, timers, calls, clones, deps };
}

describe('LiveCamRtcLink', () => {
  it('sends a 288x512 crop of the camera, H.264 first, and offers it over the socket', async () => {
    const { link, pc, transceiver, sent, clones, timers } = setup();
    await link.start();
    expect(link.state).toBe('starting');
    expect(clones[0].constraints).toMatchObject({ width: { exact: 288 }, height: { exact: 512 }, frameRate: { max: 10 }, resizeMode: 'crop-and-scale' });
    expect(clones[0].contentHint).toBe('detail');
    expect(pc.addTransceiver).toHaveBeenCalledWith(clones[0], { direction: 'sendrecv', sendEncodings: [{ maxBitrate: 1_000_000, maxFramerate: 10 }] });
    expect(transceiver.setCodecPreferences).toHaveBeenCalledWith([{ mimeType: 'video/H264' }, { mimeType: 'video/VP8' }]);
    expect(sent).toEqual([{ type: 'webrtc_offer', sdp: 'v=0 offer', ice_servers: cleanIceServers(CF) }]);
    expect(timers.some((t) => t.ms === 10_000 && !t.cleared)).toBe(true);
  });

  it('applies the answer, then counts as connected only at the first generated frame', async () => {
    const { link, pc, calls, timers } = setup();
    await link.start();
    await link.onAnswer('v=0 answer', 'tls443');
    expect(pc.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'v=0 answer' });
    expect(link.workerTurn).toBe('tls443');
    expect(calls.connected).toBe(0);
    link.markConnected();
    link.markConnected();
    expect(calls.connected).toBe(1);
    expect(link.state).toBe('connected');
    expect(timers.find((t) => t.ms === 10_000)?.cleared).toBe(true);
  });

  it('no video within 10 s: gives up, tells the worker, frees the camera clone', async () => {
    const { link, pc, sent, calls, timers, clones } = setup();
    await link.start();
    timers.find((t) => t.ms === 10_000)!.fn();
    expect(calls.failed).toEqual(['no video within 10 s']);
    expect(link.state).toBe('failed');
    expect(sent.at(-1)).toEqual({ type: 'webrtc_close' });
    expect(pc.close).toHaveBeenCalled();
    expect(clones[0].stopped).toBe(true);
    link.close(); // idempotent
    expect(sent.filter((m) => m.type === 'webrtc_close')).toHaveLength(1);
  });

  it('a browser that cannot crop stays on JPEG without opening a connection', async () => {
    const { link, deps, calls, sent } = setup({}, { width: 1280, height: 720 });
    await link.start();
    expect(calls.failed[0]).toMatch(/cannot crop/);
    expect(deps.makePeerConnection).not.toHaveBeenCalled();
    expect(sent).toEqual([]); // nothing to close on the worker
  });

  it('the worker failing, ICE failing, or a lost connection after a grace period all fall back', async () => {
    const a = setup();
    await a.link.start();
    a.link.onServerState('failed');
    expect(a.calls.failed).toEqual(['worker says failed']);

    const b = setup();
    await b.link.start();
    b.pc.connectionState = 'failed';
    b.pc.emit('connectionstatechange');
    expect(b.calls.failed).toEqual(['connection failed']);

    const c = setup();
    await c.link.start();
    c.link.markConnected();
    c.pc.connectionState = 'disconnected';
    c.pc.emit('connectionstatechange');
    expect(c.calls.failed).toEqual([]); // a Wi-Fi hiccup gets 4 s
    c.timers.find((t) => t.ms === 4000)!.fn();
    expect(c.calls.failed).toEqual(['connection lost']);
  });

  it('closing after it worked tells the worker once; Lite and camera flips follow', async () => {
    const { link, sent, params, sender, clones } = setup();
    await link.start();
    link.markConnected();
    await link.setFps(8);
    expect((params.encodings as Array<{ maxFramerate: number }>)[0].maxFramerate).toBe(8);
    expect(clones[0].constraints).toEqual({ frameRate: { max: 8 } });
    const { track: other } = fakeTrack();
    await link.replaceCamera(other);
    expect(sender.replaceTrack).toHaveBeenCalled();
    expect(clones[0].stopped).toBe(true); // the old clone
    link.close();
    expect(sent.filter((m) => m.type === 'webrtc_close')).toHaveLength(1);
    expect(link.state).toBe('closed');
  });
});

describe('stats readout', () => {
  it('summarises path, round trip, jitter buffer, fps and bitrates', () => {
    const report = [
      { type: 'transport', id: 'T', selectedCandidatePairId: 'P' },
      { type: 'candidate-pair', id: 'P', localCandidateId: 'L', remoteCandidateId: 'R', currentRoundTripTime: 0.142 },
      { type: 'local-candidate', id: 'L', candidateType: 'srflx', protocol: 'udp' },
      { type: 'remote-candidate', id: 'R', candidateType: 'relay' },
      { type: 'inbound-rtp', kind: 'video', bytesReceived: 300_000, jitterBufferDelay: 2.0, jitterBufferEmittedCount: 50, framesPerSecond: 24, codecId: 'C1' },
      { type: 'outbound-rtp', kind: 'video', bytesSent: 75_000, framesPerSecond: 10, codecId: 'C2' },
      { type: 'codec', id: 'C1', mimeType: 'video/H264' },
      { type: 'codec', id: 'C2', mimeType: 'video/H264' },
    ];
    const { stats, counters } = summarizeRtcStats(report, { at: 0, bytesIn: 0, bytesOut: 0 }, 1000);
    expect(stats).toEqual({ rttMs: 142, jitterBufferMs: 40, inFps: 24, outFps: 10, inKbps: 2400, outKbps: 600, path: 'srflx/udp -> relay', codec: 'H264 up / H264 down' });
    expect(counters).toEqual({ at: 1000, bytesIn: 300_000, bytesOut: 75_000 });
    expect(formatRtcLine(stats)).toBe('webrtc srflx/udp -> relay · rtt 142 ms · jb 40 ms · up 0.6 / down 2.4 Mbit/s · 10/24 fps · H264 up / H264 down');
    expect(summarizeRtcStats([], null, 0).stats.rttMs).toBeNull();
  });
});

describe('drawRemoteFrames', () => {
  it('draws each generated frame, calls onFirst once, closes frames, and stops', async () => {
    const frames = [{ close: vi.fn() }, { close: vi.fn() }];
    let i = 0;
    let release: () => void = () => undefined;
    const reader = {
      read: vi.fn(async () => (i < frames.length ? { value: frames[i++], done: false } : new Promise<{ done: boolean }>((r) => { release = () => r({ done: true }); }))),
      cancel: vi.fn(async () => { release(); }),
    };
    class Proc { readable = { getReader: () => reader }; constructor(public init: unknown) {} }
    const bitmaps: unknown[] = [];
    const onFirst = vi.fn();
    const stop = drawRemoteFrames({} as MediaStreamTrack, (b) => bitmaps.push(b), onFirst, {
      MediaStreamTrackProcessor: Proc,
      createImageBitmap: async (f: unknown) => ({ from: f, close: vi.fn() }) as unknown as ImageBitmap,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(bitmaps).toHaveLength(2);
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(frames.every((f) => f.close.mock.calls.length === 1)).toBe(true);
    stop();
    expect(reader.cancel).toHaveBeenCalled();
    // Without the API it does nothing (and says so by returning a no-op stop).
    expect(drawRemoteFrames({} as MediaStreamTrack, () => undefined, () => undefined, {})).toBeTypeOf('function');
  });
});
