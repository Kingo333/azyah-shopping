import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraFrameClock, FrameEncoder, noNewCameraFrame } from '../liveCamCapture';

function fakeVideo(withCallback = true) {
  const cbs: Array<(now: number, meta: { captureTime?: number }) => void> = [];
  const v: Record<string, unknown> = {};
  if (withCallback) {
    v.requestVideoFrameCallback = (cb: (now: number, meta: { captureTime?: number }) => void) => cbs.push(cb);
    v.cancelVideoFrameCallback = () => undefined;
  }
  return { v: v as unknown as HTMLVideoElement, fire: (meta: { captureTime?: number } = {}) => cbs.shift()?.(0, meta) };
}

describe('CameraFrameClock', () => {
  it('counts the camera frames the page gets and keeps the capture time', () => {
    let now = 1000;
    const { v, fire } = fakeVideo();
    const clock = new CameraFrameClock(v, () => now);
    expect(clock.supported).toBe(true);
    clock.start();
    for (let i = 0; i < 5; i++) {
      now += 1000;
      fire({ captureTime: now - 40 });
    }
    expect(clock.frameVersion).toBe(5);
    expect(clock.lastFrameAt).toBe(now - 40);
    expect(clock.lastCallbackAt).toBe(now);
    expect(clock.fps(5000)).toBe(1);
  });

  it('is inert without requestVideoFrameCallback', () => {
    const clock = new CameraFrameClock(fakeVideo(false).v);
    expect(clock.supported).toBe(false);
    clock.start();
    expect(clock.fps()).toBeNull();
  });
});

describe('noNewCameraFrame', () => {
  const clock = (version: number, lastCallbackAt: number | null, supported = true) => ({ supported, frameVersion: version, lastCallbackAt });
  it('skips only when the clock works and nothing new arrived since the last frame sent', () => {
    expect(noNewCameraFrame(clock(3, 1000), 3, 1500)).toBe(true);
    expect(noNewCameraFrame(clock(4, 1000), 3, 1500)).toBe(false);
  });
  it('sends as before without a clock, before its first tick, or when it has stalled', () => {
    expect(noNewCameraFrame(clock(3, 1000, false), 3, 1500)).toBe(false);
    expect(noNewCameraFrame(clock(0, null), 0, 1500)).toBe(false);
    expect(noNewCameraFrame(clock(3, 1000), 3, 3500)).toBe(false);
  });
});

describe('FrameEncoder', () => {
  afterEach(() => vi.unstubAllGlobals());
  const crop = { sx: 0, sy: 0, sw: 405, sh: 720 };

  function fakeWorker(reply: (msg: { id: number; width: number }) => unknown | null) {
    const w = {
      onmessage: null as ((e: { data: unknown }) => void) | null,
      onerror: null as (() => void) | null,
      posted: [] as unknown[],
      terminated: false,
      postMessage(msg: { id: number; width: number }) {
        this.posted.push(msg);
        const r = reply(msg);
        if (r) setTimeout(() => this.onmessage?.({ data: r }), 0);
      },
      terminate() { this.terminated = true; },
    };
    return w;
  }

  it('crops and resizes with createImageBitmap and encodes in the worker', async () => {
    const bitmap = { close: vi.fn() };
    const cib = vi.fn(async () => bitmap);
    vi.stubGlobal('createImageBitmap', cib);
    const w = fakeWorker((m) => ({ id: m.id, b64: 'QUJD', ms: 4 }));
    const enc = new FrameEncoder('worker', () => w as unknown as Worker, true);
    expect(enc.mode).toBe('worker');
    const res = await enc.encode({} as unknown as CanvasImageSource, crop, 288, 512, 0.8);
    expect(res).toMatchObject({ b64: 'QUJD', encodeMs: 4, mode: 'worker' });
    expect(cib).toHaveBeenCalledWith(expect.anything(), 0, 0, 405, 720, { resizeWidth: 288, resizeHeight: 512, resizeQuality: 'low' });
    expect(w.posted[0]).toMatchObject({ width: 288, height: 512, quality: 0.8, bitmap });
    enc.dispose();
    expect(w.terminated).toBe(true);
  });

  it('falls back to the main thread when the worker does not answer', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close: vi.fn() })));
    const w = fakeWorker(() => null);
    const enc = new FrameEncoder('worker', () => w as unknown as Worker, true);
    const p = enc.encode({} as unknown as CanvasImageSource, crop, 288, 512, 0.8);
    await vi.advanceTimersByTimeAsync(2500);
    expect(await p).toBeNull();                 // that frame is skipped
    expect(enc.mode).toBe('main');
    expect(enc.fallbackReason).toMatch(/no frame/);
    vi.useRealTimers();
  });

  it('uses the main thread when asked, or when the browser cannot encode off-thread', () => {
    const make = vi.fn();
    expect(new FrameEncoder('main', make as unknown as () => Worker, true).mode).toBe('main');
    expect(new FrameEncoder('worker', make as unknown as () => Worker, false).mode).toBe('main');
    expect(make).not.toHaveBeenCalled();
  });
});
