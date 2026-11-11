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
