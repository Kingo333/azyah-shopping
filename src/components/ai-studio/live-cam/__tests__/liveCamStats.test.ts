import { describe, expect, it } from 'vitest';
import { LiveCamFrameStats } from '../liveCamStats';

function clock() {
  let t = 1000;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe('buffered playback counters (F1b)', () => {
  it('counts presented frames and playback drops separately from arrivals', () => {
    const c = clock();
    const s = new LiveCamFrameStats(c.now);
    s.reset();
    s.onFrame(undefined, undefined);
    s.onFrame(undefined, undefined);
    s.onPresented();
    s.onPlaybackDropped(1);
    c.advance(100);
    s.onPresented();
    const snap = s.snapshot();
    expect(snap.framesReceived).toBe(2);
    expect(snap.framesPresented).toBe(2);
    expect(snap.playbackDropped).toBe(1);
    expect(snap.presentedFps).toBe(0.4);
    s.reset();
    expect(s.snapshot().framesPresented).toBe(0);
    expect(s.snapshot().playbackDropped).toBe(0);
  });
});

describe('LiveCamFrameStats', () => {
  it('matches echoed frame numbers and measures round trip on one clock', () => {
    const c = clock();
    const s = new LiveCamFrameStats(c.now);
    s.reset();
    const a = s.nextFrame();
    c.advance(40);
    const b = s.nextFrame();
    c.advance(200);
    expect(s.onFrame(a.seq, 150)).toBe(240);
    expect(s.onFrame(b.seq, 160)).toBe(200);
    const snap = s.snapshot();
    expect(snap.framesSent).toBe(2);
    expect(snap.framesReceived).toBe(2);
    expect(snap.matchedFrames).toBe(2);
    expect(snap.rttMsP50).toBe(200);
    expect(snap.serverMsP95).toBe(160);
    expect(snap.firstFrameMs).toBe(240);
  });

  it('counts frames without numbers (FluxRT) but reports no round trip', () => {
    const c = clock();
    const s = new LiveCamFrameStats(c.now);
    s.reset();
    s.nextFrame();
    c.advance(100);
    expect(s.onFrame(undefined, undefined)).toBeNull();
    expect(s.snapshot()).toMatchObject({ framesReceived: 1, matchedFrames: 0, rttMsP50: null });
  });

  it('ignores unknown or repeated frame numbers', () => {
    const c = clock();
    const s = new LiveCamFrameStats(c.now);
    s.reset();
    const a = s.nextFrame();
    expect(s.onFrame(999, 10)).toBeNull();
    expect(s.onFrame(a.seq, 10)).not.toBeNull();
    expect(s.onFrame(a.seq, 10)).toBeNull();
  });

  it('measures the garment swap gap to the next frame', () => {
    const c = clock();
    const s = new LiveCamFrameStats(c.now);
    s.reset();
    s.markSwap();
    c.advance(1800);
    s.onFrame(undefined, undefined);
    expect(s.snapshot().lastSwapGapMs).toBe(1800);
  });

  it('reports fps over the last 5 seconds', () => {
    const c = clock();
    const s = new LiveCamFrameStats(c.now);
    s.reset();
    for (let i = 0; i < 50; i++) { s.nextFrame(); c.advance(100); }
    expect(s.snapshot().sentFps).toBe(10);
  });
  it('reports phone encode time and skipped ticks', () => {
    const s = new LiveCamFrameStats(() => 0);
    s.reset();
    s.onEncoded(30);
    s.onEncoded(50);
    s.onEncoded(90);
    s.onEncodeSkipped();
    const snap = s.snapshot();
    expect(snap.encodeMsP50).toBe(50);
    expect(snap.encodeMsP95).toBe(90);
    expect(snap.encodeSkipped).toBe(1);
  });
});

describe('LiveCamFrameStats weak-device readout', () => {
  it('reports draw time, timer lag and camera size', () => {
    const s = new LiveCamFrameStats();
    s.setCamera(960, 540);
    [3, 5, 4].forEach((ms) => s.onDraw(ms));
    [-2, 10, 400].forEach((ms) => s.onTickLag(ms));
    const snap = s.snapshot();
    expect(snap.camera).toBe('960x540');
    expect(snap.drawMsP50).toBe(4);
    expect(snap.tickLagMsP50).toBe(10);
  });
});

describe('per-stage timing (kiosk speed work)', () => {
  it('records every stage and prints them in pipeline order', async () => {
    const { formatStageLine } = await import('../liveCamStats');
    let t = 0;
    const s = new LiveCamFrameStats(() => t);
    s.reset();
    s.setCamera(720, 1280);
    s.setCameraFps(0.9);
    s.onCameraAge(40);
    s.onDraw(3);
    s.onEncoded(12);
    s.setEncoder('worker');
    s.onUpBacklog(2048);
    s.onNetRtt(95);
    s.onDecode(8);
    s.onWait(60);
    s.onPaint(2);
    s.onStaleSkipped();
    const snap = s.snapshot();
    expect(snap).toMatchObject({ cameraFps: 0.9, cameraAgeMsP50: 40, encoder: 'worker', upBacklogKbP50: 2, netRttMsP50: 95,
      decodeMsP50: 8, waitMsP50: 60, paintMsP50: 2, staleSkipped: 1 });
    const line = formatStageLine(snap);
    const order = ['cam 0.9/s 720x1280 age 40 ms', 'resize 3 ms', 'enc 12 ms (worker)', 'backlog 2 KB', 'net 95 ms', 'dec 8 ms', 'wait 60 ms', 'paint 2 ms', 'same-frame skips 1'];
    let at = -1;
    for (const part of order) {
      const i = line.indexOf(part);
      expect(i, part).toBeGreaterThan(at);
      at = i;
    }
    s.reset();
    expect(s.snapshot()).toMatchObject({ cameraFps: null, staleSkipped: 0, netRttMsP50: null, encoder: null });
    t += 1;
  });

  it('shows how loaded the page is, and flags a hidden or unfocused page', async () => {
    const { formatStageLine } = await import('../liveCamStats');
    const s = new LiveCamFrameStats(() => 0);
    s.reset();
    s.setPageLoad(41.5, 380, false, true);
    expect(s.snapshot()).toMatchObject({ pageFps: 41.5, longTaskMsPerS: 380, pageHidden: false, pageFocused: true });
    expect(formatStageLine(s.snapshot())).toContain('page 41.5/s long tasks 380 ms/s');
    s.setPageLoad(0, null, true, false);
    const line = formatStageLine(s.snapshot());
    expect(line).toContain('page 0/s long tasks – HIDDEN no-focus');
    s.setPageLoad(Number.NaN, Number.POSITIVE_INFINITY, false, null);
    expect(s.snapshot()).toMatchObject({ pageFps: null, longTaskMsPerS: null, pageFocused: null });
    s.reset();
    expect(s.snapshot()).toMatchObject({ pageFps: null, longTaskMsPerS: null, pageHidden: false, pageFocused: null });
  });

  it('shows the WebRTC readout while it carries the frames, nothing on JPEG', async () => {
    const { formatStageLine } = await import('../liveCamStats');
    const s = new LiveCamFrameStats(() => 0);
    s.reset();
    expect(formatStageLine(s.snapshot())).not.toContain('webrtc');
    s.setTransport('webrtc srflx/udp -> relay · rtt 140 ms');
    expect(formatStageLine(s.snapshot()).endsWith('webrtc srflx/udp -> relay · rtt 140 ms')).toBe(true);
    s.setTransport(null);
    expect(s.snapshot().transport).toBeNull();
  });
});
