// Live Cam over WebRTC, browser side (12 Nov 2026). Off unless ?livecam_transport=webrtc (liveCamFlags.ts).
//
// The WebSocket to the GPU worker stays open for control and signalling. When the worker offers
// WebRTC (ready.webrtc, fluxrt-serverless LIVECAM_WEBRTC) and our TURN function (live-cam-turn) answers:
// - the camera goes out as a WebRTC video track, cropped and scaled by the browser itself to the
//   model's portrait size (288x512 today), at the Normal or Lite frame rate;
// - the generated frames come back as a video track. By default (13 Nov 2026, like Decart's SDK) the app
//   shows that stream straight in a <video> element (srcObject) over the result canvas: the browser's
//   video pipeline decodes and draws it, so the page does no work per frame (and it would work on Safari).
//   ?livecam_rtc_view=canvas keeps the older way (each frame drawn into the canvas; Chrome/Edge only).
// - which browsers try it (rtcAllowedHere): Chrome's engine (Chrome, Edge, Samsung Internet, Android, the
//   kiosk) and, since 13 Nov 2026, Safari (iPhone, iPad, Mac: LIVE_CAM_RTC_SAFARI_DEFAULT). Firefox keeps
//   JPEG unless ?livecam_rtc_all=1; ?livecam_rtc_all=0 keeps one device on Chrome-only.
// - Android (13 Nov 2026) and iPhone like Decart's SDK: the camera track goes out as it is, scaled down as a
//   whole to a 540 px short side, and the worker crops it like the JPEG path (rtcCameraMode, rawScaleFor);
//   the result plays in the <video>, unlocked inside the Start tap (primeVideoForPlayback); a page that
//   cannot show it goes back to JPEG within RTC_FIRST_FRAME_MS of connecting.
// - a browser that cannot crop the camera track (iPhone Safari) may send the camera as it is; the GPU
//   worker then crops and scales it to the model's size itself (?livecam_rtc_uncropped, liveCamFlags.ts).
// While it is connected the page sends no JPEG frames (and the worker sends none). Anything that goes
// wrong (no TURN servers, no crop support, ICE failure, no video within 10 s, the worker says no) closes
// it and the JPEG path carries on, usually without the shopper noticing.
//
// Both peers reach each other through the TURN relay (RunPod serverless takes no inbound UDP); the app
// hands the worker the same short-lived TURN credentials in its offer, so the worker holds no secret.

export const RTC_MAX_BITRATE = 1_000_000; // camera track, 288x512 at 8-10 fps: about 0.4-0.7 Mbit/s used
// The camera as it is (iPhone, like Decart: up to 1280x720 at the Normal or Lite rate); the worker scales
// it down to 288x512, so a bit more room keeps that picture as clean as the cropped one.
export const RTC_MAX_BITRATE_UNCROPPED = 1_500_000;
// The camera as it is goes out scaled down as a whole (never cropped) to about this short side; the worker
// crops the 9:16 centre and scales it to 288x512, exactly like the JPEG path. 540 = 3/4 of a 720p camera.
export const RTC_RAW_SHORT_SIDE = 540;
export const RTC_CONNECT_TIMEOUT_MS = 10_000; // with the JPEG fallback on, JPEG keeps running meanwhile
/** WebRTC only (LIVE_CAM_WEBSOCKET_FALLBACK = false): what the shopper sees when it cannot connect. */
export const RTC_ONLY_FAILURE_MESSAGE = 'Live video couldn’t connect, please try again.';
export const RTC_CONNECTING_NOTICE = 'Connecting live video…';
export const RTC_GATHER_TIMEOUT_MS = 2000;
export const RTC_DISCONNECT_GRACE_MS = 4000;
// Once connected, the worker sends video only (no JPEG), so a stream the page cannot show must hand back
// to JPEG fast: the first frame normally shows within 0.1-0.5 s of connecting.
export const RTC_FIRST_FRAME_MS = 3000;

const ICE_URL_RE = /^(stun|turn|turns):([^?:/\s]+)(?::(\d+))?(?:\?transport=(udp|tcp))?$/i;

/** The TURN function's iceServers, cleaned: stun/turn/turns URLs only, port 53 dropped, empty entries gone. */
export function cleanIceServers(list: unknown): RTCIceServer[] {
  if (!Array.isArray(list)) return [];
  const out: RTCIceServer[] = [];
  for (const s of list as Array<Record<string, unknown>>) {
    if (!s || typeof s !== 'object') continue;
    const raw = Array.isArray(s.urls) ? s.urls : [s.urls];
    const urls = raw.filter((u): u is string => typeof u === 'string' && ICE_URL_RE.test(u.trim()) && ICE_URL_RE.exec(u.trim())?.[3] !== '53');
    if (!urls.length) continue;
    const entry: RTCIceServer = { urls };
    if (typeof s.username === 'string' && typeof s.credential === 'string') {
      entry.username = s.username;
      entry.credential = s.credential;
    } else if (urls.some((u) => /^turns?:/i.test(u))) {
      continue; // a TURN URL without credentials is useless
    }
    out.push(entry);
  }
  return out;
}

type Globals = { RTCPeerConnection?: unknown; MediaStreamTrackProcessor?: unknown; createImageBitmap?: unknown };

/** How the generated video is shown: 'video' = a <video> element (every browser), 'canvas' = frames drawn
 * into the result canvas (needs MediaStreamTrackProcessor: Chrome, Edge, Android Chrome). */
export type RtcView = 'video' | 'canvas';

/** WebRTC this browser can use for the chosen view. Elsewhere the JPEG path stays. */
export function canUseWebRtc(g: Globals = globalThis as unknown as Globals, view: RtcView = 'canvas'): boolean {
  if (typeof g.RTCPeerConnection !== 'function') return false;
  if (view === 'video') return true;
  return typeof g.MediaStreamTrackProcessor === 'function' && typeof g.createImageBitmap === 'function';
}

/** Which browser engine: 'chromium' (Chrome, Edge, Samsung Internet, Android, the kiosk: it has the frame
 * reader the canvas view needs), 'webkit' (Safari, and every browser on an iPhone or iPad), 'other' (Firefox). */
export type RtcEngine = 'chromium' | 'webkit' | 'other';

export function rtcEngine(g: Globals & { navigator?: { vendor?: string } } = globalThis as never): RtcEngine {
  // Every WebKit browser (Safari on Mac, any browser on iOS and iPadOS) reports Apple as the vendor;
  // checked first so a future Safari with the frame reader still counts as Safari.
  if (g.navigator?.vendor === 'Apple Computer, Inc.') return 'webkit';
  if (typeof g.MediaStreamTrackProcessor === 'function') return 'chromium';
  return 'other';
}

/** Who tries WebRTC: liveCamFlags.ts sets these (per-device switch first, then the defaults). */
export interface RtcBrowserPolicy {
  /** ?livecam_rtc_all: 'on' = every browser with WebRTC, 'off' = Chrome's engine only, null = defaults. */
  allBrowsers: 'on' | 'off' | null;
  /** Safari / iPhone by default (LIVE_CAM_RTC_SAFARI_DEFAULT). */
  safari: boolean;
  /** Firefox and other engines by default (LIVE_CAM_RTC_ALL_BROWSERS_DEFAULT). */
  others: boolean;
}

/**
 * Whether this browser tries WebRTC at all. Chrome's engine always (checked end to end). Safari (iPhone,
 * iPad, Mac) by default since 13 Nov 2026 (policy.safari), Firefox only when switched on; the per-device
 * ?livecam_rtc_all switch overrides both. Elsewhere the JPEG path stays.
 */
export function rtcAllowedHere(
  g: Globals & { navigator?: { vendor?: string } } = globalThis as never,
  view: RtcView = 'video',
  policy: RtcBrowserPolicy | boolean = { allBrowsers: null, safari: false, others: false },
): boolean {
  if (!canUseWebRtc(g, view)) return false;
  const engine = rtcEngine(g);
  if (engine === 'chromium') return true;
  const p: RtcBrowserPolicy = typeof policy === 'boolean' ? { allBrowsers: policy ? 'on' : null, safari: false, others: false } : policy;
  if (p.allBrowsers === 'on') return true;
  if (p.allBrowsers === 'off') return false;
  return engine === 'webkit' ? p.safari : p.others;
}

/** Android (any browser): its camera frames reach Chrome's per-track crop rotated, see rtcCameraMode. */
export function rtcIsAndroid(g: { navigator?: { userAgent?: string } } = globalThis as never): boolean {
  return /Android/i.test(g.navigator?.userAgent ?? '');
}

/**
 * How the camera goes out, unless a device switch says otherwise (?livecam_rtc_uncropped):
 * - Chrome on a computer (and the kiosk) crops and scales it to the model size itself ('off', checked end to end).
 * - Android sends it as it is ('always'), 13 Nov 2026: on Android the camera frames reach Chrome's per-track
 *   crop with width and height swapped (Chromium issue 40519078), so on some phones (a Galaxy S7 edge) the
 *   crop came out as a horizontal band reported as 288x512, and the worker's 9:16 centre of that band was a
 *   ~3x zoom on the face. As it is, the worker sees the real frame and crops it like the JPEG path.
 * - Safari sends it as it is ('always', like Decart's SDK: upright in any orientation).
 * - Other engines crop when they can, else send it as it is.
 */
export function rtcCameraMode(engine: RtcEngine, override: 'off' | 'fallback' | 'always' | null, android = false): 'off' | 'fallback' | 'always' {
  if (override) return override;
  if (engine === 'chromium') return android ? 'always' : 'off';
  if (engine === 'webkit') return 'always';
  return 'fallback';
}

/** The whole-picture scale for the camera as it is: short side down to about RTC_RAW_SHORT_SIDE, never up,
 * the same in either orientation (so nothing is cropped in the browser). 1 = as captured. */
export function rawScaleFor(width: number | undefined, height: number | undefined): number {
  const short = Math.min(width ?? 0, height ?? 0);
  if (!(short > RTC_RAW_SHORT_SIDE)) return 1;
  return Math.round((short / RTC_RAW_SHORT_SIDE) * 100) / 100;
}

/** H.264 first (hardware on phones and the kiosk), the rest as the browser lists them. */
export function orderCodecs<T extends { mimeType: string; sdpFmtpLine?: string }>(codecs: T[]): T[] {
  // H.264 first (hardware on phones and the kiosk). Within it, what the worker (aiortc) takes: Constrained
  // Baseline or Baseline with packetization-mode 1. Safari lists High first, so this puts its usable one on top.
  const rank = (c: T): number => {
    const f = (c.sdpFmtpLine ?? '').toLowerCase();
    const mode1 = /packetization-mode=1/.test(f);
    const baseline = /profile-level-id=42(e0|00|c0)/.test(f);
    return mode1 && baseline ? 0 : mode1 ? 1 : 2;
  };
  const h264 = codecs.filter((c) => c.mimeType.toLowerCase() === 'video/h264').map((c, i) => ({ c, i }));
  h264.sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i);
  return [...h264.map((x) => x.c), ...codecs.filter((c) => c.mimeType.toLowerCase() !== 'video/h264')];
}

export type RtcLinkState = 'idle' | 'starting' | 'connected' | 'failed' | 'closed';

export interface RtcStats {
  rttMs: number | null;
  jitterBufferMs: number | null;
  inFps: number | null;
  outFps: number | null;
  inKbps: number | null;
  outKbps: number | null;
  /** e.g. "srflx/udp -> relay": this device's side of the chosen path, then the worker's. */
  path: string | null;
  /** Frame sizes on the wire, e.g. "540x960 up / 576x1024 down" (checks the camera framing on any device). */
  sizes?: string | null;
  codec: string | null;
}

export interface RtcLinkOptions {
  /** The live camera track; the link sends a clone, cropped and scaled by the browser where it can. */
  cameraTrack: MediaStreamTrack;
  /**
   * 'off' = the browser crops to the model size or the link stays on JPEG (Chrome's default); 'fallback' =
   * crop where it can, else send the camera as it is and let the worker crop; 'always' = send the camera as
   * it is (Safari's default, see rtcCameraMode).
   */
  uncropped?: 'off' | 'fallback' | 'always';
  width: number;
  height: number;
  fps: number;
  maxBitrate?: number;
  iceServers: RTCIceServer[];
  /** Sends one signalling message on the existing WebSocket. */
  send: (msg: Record<string, unknown>) => void;
  /** The generated video track (draw it with drawRemoteFrames). */
  onRemoteTrack: (track: MediaStreamTrack) => void;
  /** First generated frame drawn: the page may stop sending JPEG frames. */
  onConnected: () => void;
  /** Gave up; the JPEG path carries on. */
  onFailed: (reason: string) => void;
  connectTimeoutMs?: number;
  gatherTimeoutMs?: number;
}

export interface RtcLinkDeps {
  makePeerConnection: (config: RTCConfiguration) => RTCPeerConnection;
  getCodecs: () => Array<{ mimeType: string }> | null;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
  now: () => number;
}

function defaultDeps(): RtcLinkDeps {
  return {
    makePeerConnection: (config) => new RTCPeerConnection(config),
    getCodecs: () => {
      try { return (RTCRtpSender as unknown as { getCapabilities?: (k: string) => { codecs: Array<{ mimeType: string }> } | null }).getCapabilities?.('video')?.codecs ?? null; } catch { return null; }
    },
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
    now: () => performance.now(),
  };
}

type StatEntry = Record<string, unknown> & { type?: string; id?: string };

/** One readable summary of a getStats() report (pure; prev = the previous call's byte counters). */
export function summarizeRtcStats(
  report: Iterable<StatEntry>,
  prev: { at: number; bytesIn: number; bytesOut: number } | null,
  now: number,
): { stats: RtcStats; counters: { at: number; bytesIn: number; bytesOut: number } } {
  const byId = new Map<string, StatEntry>();
  const all: StatEntry[] = [];
  for (const r of report) {
    all.push(r);
    if (typeof r.id === 'string') byId.set(r.id, r);
  }
  const inbound = all.find((r) => r.type === 'inbound-rtp' && r.kind === 'video');
  const outbound = all.find((r) => r.type === 'outbound-rtp' && r.kind === 'video');
  const transport = all.find((r) => r.type === 'transport');
  const pairId = typeof transport?.selectedCandidatePairId === 'string' ? transport.selectedCandidatePairId : null;
  const pair = (pairId && byId.get(pairId)) || all.find((r) => r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated === true);
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  let path: string | null = null;
  if (pair) {
    const local = byId.get(String(pair.localCandidateId));
    const remote = byId.get(String(pair.remoteCandidateId));
    if (local || remote) {
      const relayVia = typeof local?.relayProtocol === 'string' ? `/${local.relayProtocol}` : '';
      path = `${local?.candidateType ?? '?'}${relayVia || (local?.protocol ? `/${local.protocol}` : '')} -> ${remote?.candidateType ?? '?'}`;
    }
  }
  const rtt = num(pair?.currentRoundTripTime);
  const jbDelay = num(inbound?.jitterBufferDelay);
  const jbCount = num(inbound?.jitterBufferEmittedCount);
  const bytesIn = num(inbound?.bytesReceived) ?? 0;
  const bytesOut = num(outbound?.bytesSent) ?? 0;
  const span = prev ? (now - prev.at) / 1000 : 0;
  const kbps = (cur: number, before: number) => (prev && span > 0.2 && cur >= before ? Math.round(((cur - before) * 8) / 1000 / span) : null);
  const codecOf = (r: StatEntry | undefined) => {
    const c = r && typeof r.codecId === 'string' ? byId.get(r.codecId) : undefined;
    return typeof c?.mimeType === 'string' ? c.mimeType.replace(/^video\//i, '') : null;
  };
  const inCodec = codecOf(inbound);
  const outCodec = codecOf(outbound);
  const sizeOf = (r: StatEntry | undefined) => {
    const w = num(r?.frameWidth);
    const h = num(r?.frameHeight);
    return w && h ? `${w}x${h}` : null;
  };
  const upSize = sizeOf(outbound);
  const downSize = sizeOf(inbound);
  return {
    stats: {
      rttMs: rtt === null ? null : Math.round(rtt * 1000),
      jitterBufferMs: jbDelay !== null && jbCount ? Math.round((1000 * jbDelay) / jbCount) : null,
      inFps: num(inbound?.framesPerSecond),
      outFps: num(outbound?.framesPerSecond),
      inKbps: kbps(bytesIn, prev?.bytesIn ?? 0),
      outKbps: kbps(bytesOut, prev?.bytesOut ?? 0),
      path,
      codec: inCodec || outCodec ? `${outCodec ?? '?'} up / ${inCodec ?? '?'} down` : null,
      sizes: upSize || downSize ? `${upSize ?? '?'} up / ${downSize ?? '?'} down` : null,
    },
    counters: { at: now, bytesIn, bytesOut },
  };
}

/** For the stage readout: "webrtc srflx/udp -> relay rtt 140 ms jb 45 ms up 0.6 / down 2.4 Mbit/s 10/24 fps H264". */
export function formatRtcLine(s: RtcStats): string {
  const ms = (v: number | null) => (v === null ? '–' : `${v} ms`);
  const mbit = (v: number | null) => (v === null ? '–' : (v / 1000).toFixed(1));
  return [
    `webrtc ${s.path ?? ''}`.trim(),
    `rtt ${ms(s.rttMs)}`,
    `jb ${ms(s.jitterBufferMs)}`,
    `up ${mbit(s.outKbps)} / down ${mbit(s.inKbps)} Mbit/s`,
    `${s.outFps ?? '–'}/${s.inFps ?? '–'} fps`,
    s.codec ?? '',
    s.sizes ?? '',
  ].filter(Boolean).join(' · ');
}

async function waitForGathering(pc: RTCPeerConnection, timeoutMs: number, deps: RtcLinkDeps): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve) => {
    const timer = deps.setTimer(resolve, timeoutMs);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        deps.clearTimer(timer);
        resolve();
      }
    });
  });
}

/** One WebRTC connection for one live session (see the top of the file). */
export class LiveCamRtcLink {
  state: RtcLinkState = 'idle';
  /** How the worker reaches the relay ('udp', 'tls443', ...), from its answer. */
  workerTurn: string | null = null;
  failReason: string | null = null;
  private pc: RTCPeerConnection | null = null;
  private sender: RTCRtpSender | null = null;
  private sendTrack: MediaStreamTrack | null = null;
  private connectTimer: unknown = null;
  private dropTimer: unknown = null;
  private firstFrameTimer: unknown = null;
  private offerSent = false;
  private counters: { at: number; bytesIn: number; bytesOut: number } | null = null;
  private fps: number;

  constructor(private readonly opts: RtcLinkOptions, private readonly deps: RtcLinkDeps = defaultDeps()) {
    this.fps = opts.fps;
  }

  /** Whether the camera goes out cropped by the browser (true) or as it is, for the worker to crop (false). */
  sentCropped: boolean | null = null;
  /** For the camera as it is: the whole-picture scale-down handed to the encoder (rawScaleFor). */
  rawScale = 1;

  private async croppedClone(track: MediaStreamTrack): Promise<MediaStreamTrack | null> {
    const mode = this.opts.uncropped ?? 'off';
    const t = track.clone();
    if (mode !== 'always') {
      try {
        // Chrome crops the centre and scales, the same picture the JPEG path cuts with coverCropRect.
        await t.applyConstraints({
          width: { exact: this.opts.width },
          height: { exact: this.opts.height },
          frameRate: { max: this.fps },
          resizeMode: 'crop-and-scale',
        } as MediaTrackConstraints);
      } catch { /* checked below */ }
      const s = t.getSettings?.() ?? {};
      if (s.width === this.opts.width && s.height === this.opts.height) {
        try { t.contentHint = 'detail'; } catch { /* older browsers */ }
        this.sentCropped = true;
        return t;
      }
      if (mode === 'off') {
        t.stop();
        return null;
      }
    }
    // As it is (like Decart's SDK): only the frame rate is capped; the GPU worker crops the centre and
    // scales to the model's size itself, the same crop the JPEG path makes. The encoder scales the whole
    // picture down (sendEncodings.scaleResolutionDownBy), which keeps every pixel of the view.
    try { await t.applyConstraints({ frameRate: { max: this.fps } }); } catch { /* keep the camera's rate */ }
    try { t.contentHint = 'detail'; } catch { /* older browsers */ }
    const raw = t.getSettings?.() ?? {};
    this.rawScale = rawScaleFor(raw.width, raw.height);
    this.sentCropped = false;
    return t;
  }

  async start(): Promise<void> {
    if (this.state !== 'idle') return;
    this.state = 'starting';
    const track = await this.croppedClone(this.opts.cameraTrack);
    if (!track) {
      this.fail('this browser cannot crop the camera track');
      return;
    }
    if (this.state !== 'starting') {
      track.stop();
      return;
    }
    this.sendTrack = track;
    let pc: RTCPeerConnection;
    try {
      pc = this.deps.makePeerConnection({ iceServers: this.opts.iceServers, bundlePolicy: 'max-bundle' });
    } catch (e) {
      this.fail(`no peer connection: ${String(e)}`);
      return;
    }
    this.pc = pc;
    pc.addEventListener('track', (e: RTCTrackEvent) => {
      if (e.track?.kind === 'video') this.opts.onRemoteTrack(e.track);
    });
    pc.addEventListener('connectionstatechange', () => this.onIceChange());
    try {
      const maxBitrate = this.opts.maxBitrate ?? (this.sentCropped ? RTC_MAX_BITRATE : RTC_MAX_BITRATE_UNCROPPED);
      let tr: RTCRtpTransceiver;
      let limitsLater = false;
      const encoding: RTCRtpEncodingParameters = { maxBitrate, maxFramerate: this.fps };
      if (!this.sentCropped && this.rawScale > 1) encoding.scaleResolutionDownBy = this.rawScale;
      try {
        tr = pc.addTransceiver(track, { direction: 'sendrecv', sendEncodings: [encoding] });
      } catch {
        // Safari before 14.1 takes no sendEncodings here: add the track plainly, set the limits below.
        tr = pc.addTransceiver(track, { direction: 'sendrecv' });
        limitsLater = true;
      }
      this.sender = tr.sender;
      try {
        const p = tr.sender.getParameters() as RTCRtpSendParameters & { degradationPreference?: string };
        p.degradationPreference = 'maintain-resolution'; // fewer frames, never a smaller picture for the model
        if (limitsLater && p.encodings?.[0]) {
          p.encodings[0].maxBitrate = maxBitrate;
          p.encodings[0].maxFramerate = this.fps;
          if (encoding.scaleResolutionDownBy) p.encodings[0].scaleResolutionDownBy = encoding.scaleResolutionDownBy;
        }
        await tr.sender.setParameters(p);
      } catch { /* not supported: the browser's default */ }
      const codecs = this.deps.getCodecs();
      if (codecs?.length && typeof tr.setCodecPreferences === 'function') {
        try { tr.setCodecPreferences(orderCodecs(codecs) as Parameters<RTCRtpTransceiver['setCodecPreferences']>[0]); } catch { /* keep the default order */ }
      }
      await pc.setLocalDescription(await pc.createOffer());
      await waitForGathering(pc, this.opts.gatherTimeoutMs ?? RTC_GATHER_TIMEOUT_MS, this.deps);
    } catch (e) {
      this.fail(`offer failed: ${String(e)}`);
      return;
    }
    if (this.state !== 'starting') return;
    this.opts.send({ type: 'webrtc_offer', sdp: pc.localDescription?.sdp ?? '', ice_servers: this.opts.iceServers });
    this.offerSent = true;
    this.connectTimer = this.deps.setTimer(() => {
      if (this.state === 'starting') this.fail(`no video within ${Math.round((this.opts.connectTimeoutMs ?? RTC_CONNECT_TIMEOUT_MS) / 1000)} s`);
    }, this.opts.connectTimeoutMs ?? RTC_CONNECT_TIMEOUT_MS);
  }

  async onAnswer(sdp: string, workerTurn?: unknown): Promise<void> {
    if (this.state !== 'starting' || !this.pc) return;
    if (typeof workerTurn === 'string') this.workerTurn = workerTurn;
    try {
      await this.pc.setRemoteDescription({ type: 'answer', sdp });
    } catch (e) {
      this.fail(`bad answer: ${String(e)}`);
    }
  }

  /** The worker's own view of the connection (webrtc_state). */
  onServerState(state: string): void {
    if (state === 'failed' || state === 'closed') this.fail(`worker says ${state}`);
  }

  /** The first generated frame was drawn. */
  markConnected(): void {
    if (this.state !== 'starting') return;
    this.state = 'connected';
    this.deps.clearTimer(this.connectTimer);
    this.connectTimer = null;
    if (this.firstFrameTimer !== null) this.deps.clearTimer(this.firstFrameTimer);
    this.firstFrameTimer = null;
    this.opts.onConnected();
  }

  private onIceChange(): void {
    const s = this.pc?.connectionState;
    if (s === 'failed') {
      this.fail('connection failed');
    } else if (s === 'disconnected') {
      // Wi-Fi hiccup: give ICE a few seconds to recover before going back to JPEG.
      if (this.dropTimer === null) {
        this.dropTimer = this.deps.setTimer(() => {
          this.dropTimer = null;
          if (this.pc?.connectionState === 'disconnected') this.fail('connection lost');
        }, RTC_DISCONNECT_GRACE_MS);
      }
    } else if (s === 'connected') {
      if (this.dropTimer !== null) {
        this.deps.clearTimer(this.dropTimer);
        this.dropTimer = null;
      }
      // Connected, so the worker now sends video only: if this page cannot show it (playback blocked,
      // a codec it cannot decode), go back to JPEG within seconds instead of a frozen picture.
      if (this.state === 'starting' && this.firstFrameTimer === null) {
        this.firstFrameTimer = this.deps.setTimer(() => {
          this.firstFrameTimer = null;
          if (this.state === 'starting') this.fail(`connected but no video shown within ${Math.round(RTC_FIRST_FRAME_MS / 1000)} s`);
        }, RTC_FIRST_FRAME_MS);
      }
    }
  }

  /** Lite on/off mid-session: the send rate follows. */
  async setFps(fps: number): Promise<void> {
    this.fps = fps;
    try { await this.sendTrack?.applyConstraints({ frameRate: { max: fps } }); } catch { /* keep */ }
    if (!this.sender) return;
    try {
      const p = this.sender.getParameters();
      if (p.encodings?.[0]) p.encodings[0].maxFramerate = fps;
      await this.sender.setParameters(p);
    } catch { /* keep */ }
  }

  /** Front/back camera switched: send the new camera instead. */
  async replaceCamera(track: MediaStreamTrack): Promise<void> {
    if (!this.sender || (this.state !== 'starting' && this.state !== 'connected')) return;
    const next = await this.croppedClone(track);
    if (!next) {
      this.fail('the new camera cannot be cropped');
      return;
    }
    try {
      await this.sender.replaceTrack(next);
      this.sendTrack?.stop();
      this.sendTrack = next;
      if (!this.sentCropped) {
        // The other camera may have another size: keep the whole-picture scale in step.
        try {
          const p = this.sender.getParameters();
          if (p.encodings?.[0]) {
            p.encodings[0].scaleResolutionDownBy = this.rawScale;
            await this.sender.setParameters(p);
          }
        } catch { /* keep the previous scale */ }
      }
    } catch (e) {
      next.stop();
      this.fail(`camera switch failed: ${String(e)}`);
    }
  }

  async stats(): Promise<RtcStats | null> {
    if (!this.pc) return null;
    try {
      const report = await this.pc.getStats();
      const entries: StatEntry[] = [];
      report.forEach((r: StatEntry) => entries.push(r));
      const { stats, counters } = summarizeRtcStats(entries, this.counters, this.deps.now());
      this.counters = counters;
      return stats;
    } catch {
      return null;
    }
  }

  fail(reason: string): void {
    if (this.state === 'failed' || this.state === 'closed') return;
    this.state = 'failed';
    this.failReason = reason;
    this.teardown();
    this.opts.onFailed(reason);
  }

  close(): void {
    if (this.state === 'failed' || this.state === 'closed') return;
    this.state = 'closed';
    this.teardown();
  }

  private teardown(): void {
    if (this.connectTimer !== null) this.deps.clearTimer(this.connectTimer);
    if (this.dropTimer !== null) this.deps.clearTimer(this.dropTimer);
    if (this.firstFrameTimer !== null) this.deps.clearTimer(this.firstFrameTimer);
    this.connectTimer = null;
    this.dropTimer = null;
    this.firstFrameTimer = null;
    try { this.sendTrack?.stop(); } catch { /* already stopped */ }
    this.sendTrack = null;
    try { this.pc?.close(); } catch { /* already closed */ }
    this.pc = null;
    this.sender = null;
    // Tell the worker to go back to JPEG frames on the socket.
    if (this.offerSent) {
      this.offerSent = false;
      try { this.opts.send({ type: 'webrtc_close' }); } catch { /* socket gone */ }
    }
  }
}

type FrameReader = { read: () => Promise<{ value?: { close: () => void }; done: boolean }>; cancel: () => Promise<void> };
type ProcessorCtor = new (init: { track: MediaStreamTrack; maxBufferSize?: number }) => { readable: { getReader: () => FrameReader } };

/**
 * Draws each generated frame through `present` (as an ImageBitmap, like a decoded JPEG) and calls
 * onFirst once. Returns a stop function. Uses MediaStreamTrackProcessor (Chrome, Edge, Android).
 */
export function drawRemoteFrames(
  track: MediaStreamTrack,
  present: (bitmap: ImageBitmap) => void,
  onFirst: () => void,
  g: { MediaStreamTrackProcessor?: unknown; createImageBitmap?: (src: unknown) => Promise<ImageBitmap> } = globalThis as never,
): () => void {
  const Ctor = g.MediaStreamTrackProcessor as ProcessorCtor | undefined;
  const makeBitmap = g.createImageBitmap;
  if (typeof Ctor !== 'function' || typeof makeBitmap !== 'function') return () => undefined;
  const reader = new Ctor({ track, maxBufferSize: 2 }).readable.getReader();
  let stopped = false;
  let first = true;
  void (async () => {
    while (!stopped) {
      let res: Awaited<ReturnType<FrameReader['read']>>;
      try { res = await reader.read(); } catch { break; }
      if (res.done || !res.value) break;
      const frame = res.value;
      try {
        const bitmap = await makeBitmap(frame);
        if (stopped) {
          bitmap.close?.();
        } else {
          present(bitmap);
          if (first) {
            first = false;
            onFirst();
          }
        }
      } catch { /* skip this frame */ } finally {
        frame.close();
      }
    }
  })();
  return () => {
    stopped = true;
    reader.cancel().catch(() => undefined);
  };
}

/** Smaller than this is a placeholder, not a generated frame (those are 288x512 and up). */
export const MIN_REAL_FRAME_PX = 16;

type VideoWithCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: unknown) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Shows the generated stream in a <video> element (like Decart's SDK) and reports each frame the browser
 * presents (onFrame) and the first one (onFirst). Uses requestVideoFrameCallback (Chrome, Edge, Safari 15.4+);
 * without it, the first 'loadeddata' with a picture counts. Returns a stop function that detaches the stream.
 */
export function showRemoteVideo(
  video: HTMLVideoElement,
  track: MediaStreamTrack,
  onFrame: () => void,
  onFirst: () => void,
  makeStream: (tracks: MediaStreamTrack[]) => MediaStream = (tracks) => new MediaStream(tracks),
  /** The browser refused to play it (NotAllowedError): the caller goes back to JPEG at once. */
  onBlocked?: (reason: string) => void,
): () => void {
  const v = video as VideoWithCallback;
  let stopped = false;
  let first = true;
  let cbId: number | null = null;
  const seen = () => {
    if (stopped) return;
    onFrame();
    if (first) {
      first = false;
      onFirst();
    }
  };
  setInlinePlayback(v);
  v.srcObject = makeStream([track]);
  // A real picture only: a browser may present a tiny black placeholder (2x2) while the stream starts or
  // ends, which must not count as "the video shows" (that would skip the hand-back to JPEG).
  const real = (w: number | undefined, h: number | undefined) => (w ?? 0) >= MIN_REAL_FRAME_PX && (h ?? 0) >= MIN_REAL_FRAME_PX;
  const onLoaded = () => { if (real(v.videoWidth, v.videoHeight) && typeof v.requestVideoFrameCallback !== 'function') seen(); };
  v.addEventListener('loadeddata', onLoaded);
  if (typeof v.requestVideoFrameCallback === 'function') {
    const loop = (_now: number, meta: unknown) => {
      const m = meta as { width?: number; height?: number } | undefined;
      if (real(m?.width ?? v.videoWidth, m?.height ?? v.videoHeight)) seen();
      if (!stopped) cbId = v.requestVideoFrameCallback!(loop);
    };
    cbId = v.requestVideoFrameCallback(loop);
  }
  void v.play?.()?.catch?.((e: unknown) => {
    // AbortError only means the source changed; NotAllowedError means this page may not play video now.
    if (!stopped && (e as { name?: string } | null)?.name === 'NotAllowedError') onBlocked?.('video playback blocked');
  });
  return () => {
    stopped = true;
    v.removeEventListener('loadeddata', onLoaded);
    if (cbId !== null) v.cancelVideoFrameCallback?.(cbId);
    v.srcObject = null;
  };
}

/** iPhone Safari plays a video in the page (not full screen) only when it is muted and inline. */
function setInlinePlayback(v: HTMLVideoElement): void {
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.autoplay = true;
  try {
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
  } catch { /* not an element (tests) */ }
}

/**
 * Called inside the shopper's tap on Start (before anything async): playing the still-empty result <video>
 * there lets Safari play the WebRTC stream later without another tap. Safari already allows a camera or
 * WebRTC stream while the page uses the camera (even in Low Power Mode, MediaElementSession.cpp); this
 * covers older iPhones too. Harmless elsewhere (Chrome just rejects the empty play).
 */
export function primeVideoForPlayback(video: HTMLVideoElement | null | undefined): void {
  if (!video) return;
  try {
    setInlinePlayback(video);
    if (!video.srcObject) void video.play?.()?.catch?.(() => undefined);
  } catch { /* old browsers */ }
}
