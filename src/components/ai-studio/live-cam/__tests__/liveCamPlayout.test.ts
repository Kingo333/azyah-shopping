import { describe, expect, it } from 'vitest';
import { CaptureTimePlayout, DEFAULT_PLAYOUT_OPTIONS, type CaptureTimePlayoutOptions } from '../liveCamPlayout';
import { liveCamPlayoutMode } from '../liveCamFlags';

const FRAME = 1000 / 24;
const VSYNC = 1000 / 60;

/**
 * Drive a playout like the app: frames arrive (decoded) at given times, the display ticks at
 * 60 Hz. Returns [captureMs, shownAt] for every frame shown.
 */
function play(
  arrivals: { c: number | null; at: number }[],
  until: number,
  opts: Partial<CaptureTimePlayoutOptions> = {},
  hooks: { at: number; run: (p: CaptureTimePlayout<number>) => void }[] = [],
) {
  let now = 0;
  const p = new CaptureTimePlayout<number>(() => now, opts);
  const shown: [number, number][] = [];
  const caps = new Map<number, number | null>();
  const queue = [...arrivals].sort((a, b) => a.at - b.at);
  const todo = [...hooks].sort((a, b) => a.at - b.at);
  let id = 0;
  for (let tick = 0; tick <= until; tick += VSYNC) {
    while (todo.length && todo[0].at <= tick) todo.shift()!.run(p);
    while (queue.length && queue[0].at <= tick) {
      const a = queue.shift()!;
      now = a.at;
      id += 1;
      caps.set(id, a.c);
      p.push(id, a.c);
    }
    now = tick;
    const f = p.next(now);
    if (f !== null) shown.push([caps.get(f) ?? NaN, now]);
  }
  return { shown, p };
}

/** JoyAI-like stream: camera at 24 fps, chunks of 8, each chunk arriving `lag` ms after its last frame. */
function chunks(n: number, lag: number, start = 0, every = FRAME) {
  const out: { c: number; at: number }[] = [];
  for (let k = 0; k < n; k += 1) {
    const last = start + (8 * k + 7) * every;
    for (let j = 0; j < 8; j += 1) out.push({ c: start + (8 * k + j) * every, at: last + lag + j * 4 });
  }
  return out;
}

describe('capture-time playout', () => {
  it('plays chunked frames at their real spacing with a constant delay', () => {
    const { shown } = play(chunks(60, 500), 25_000);
    const steady = shown.filter(([, t]) => t > 5000);
    expect(steady.length).toBeGreaterThan(200);
    for (let i = 1; i < steady.length; i += 1) {
      const e = (steady[i][1] - steady[i - 1][1]) - (steady[i][0] - steady[i - 1][0]);
      expect(Math.abs(e)).toBeLessThanOrEqual(VSYNC + 1);            // true speed, within one refresh
    }
    const lat = steady.map(([c, t]) => t - c);
    // The first frame of each chunk waits for 7 more (292 ms) + 500 ms + 28 ms of arrival spread.
    expect(Math.min(...lat)).toBeGreaterThan(800);
    expect(Math.max(...lat)).toBeLessThan(800 + 20 + 30 + VSYNC + 2);
  });

  it('holds a missing camera frame instead of fast-forwarding', () => {
    // Every other camera frame never made it (a slow upload): 12 fps of real content.
    const { shown } = play(chunks(40, 400, 0, 2 * FRAME), 30_000);
    const steady = shown.filter(([, t]) => t > 6000);
    for (let i = 1; i < steady.length; i += 1) {
      const dt = steady[i][1] - steady[i - 1][1];
      expect(dt).toBeGreaterThan(2 * FRAME - VSYNC - 1);              // ~83 ms apart, like the camera
    }
  });

  it('when frames start arriving later, waits for them at once (one hold), then plays smoothly', () => {
    const early = chunks(30, 300);
    const late = chunks(30, 900, 30 * 8 * FRAME);
    const { shown, p } = play([...early, ...late], 25_000);
    const after = shown.filter(([c]) => c > 30 * 8 * FRAME + 2000);
    for (let i = 1; i < after.length; i += 1) {
      const e = (after[i][1] - after[i - 1][1]) - (after[i][0] - after[i - 1][0]);
      expect(Math.abs(e)).toBeLessThanOrEqual(VSYNC + 1);
    }
    expect(p.delayMs).toBeGreaterThan(900);
  });

  it('when frames arrive sooner again, comes down gently (at most 25% faster)', () => {
    const slow = chunks(30, 900);
    const fast = chunks(60, 300, 30 * 8 * FRAME);
    const { shown, p } = play([...slow, ...fast], 30_000);
    for (let i = 1; i < shown.length; i += 1) {
      if (shown[i][1] < 3000) continue;
      const dc = shown[i][0] - shown[i - 1][0];
      const dt = shown[i][1] - shown[i - 1][1];
      expect(dt).toBeGreaterThanOrEqual(dc * (1 - DEFAULT_PLAYOUT_OPTIONS.maxSpeedup) - VSYNC - 1);
    }
    expect(p.delayMs).toBeLessThan(700); // settled back near 300 + 292 + margin
  });

  it('a garment swap does not leave extra lag behind', () => {
    // Steady at 300 ms; at the swap JoyAI restarts and the first chunk comes 1 s later than usual.
    const before = chunks(40, 300);
    const t0 = 40 * 8 * FRAME + 600;
    const after = chunks(40, 300, t0).map((a, i) => (i < 8 ? { ...a, at: a.at + 1000 } : a));
    const { shown, p } = play([...before, ...after], t0 + 20_000, {}, [{ at: t0 - 600, run: (pl) => pl.transient() }]);
    // Ten seconds later the delay is back where it was before the swap.
    const lateLat = shown.filter(([, t]) => t > t0 + 10_000).map(([c, t]) => t - c);
    expect(Math.max(...lateLat)).toBeLessThan(300 + 292 + 20 + 30 + VSYNC + 2);
    expect(p.delayMs).toBeLessThan(700);
  });

  it('frames without a timestamp are shown as they come, in order; older ones are dropped', () => {
    let now = 0;
    const p = new CaptureTimePlayout<string>(() => now);
    now = 100; p.push('a', null);
    expect(p.next(100)).toBe('a');
    now = 150; p.push('b', undefined);
    expect(p.next(150)).toBe('b');
    now = 200;
    expect(p.push('old', 10)).toBe(1);        // captured before what is already on screen
    expect(p.snapshot().framesDropped).toBe(1);
  });

  it('shows the newest due frame and releases the skipped ones', () => {
    let now = 0;
    const released: number[] = [];
    const p = new CaptureTimePlayout<number>(() => now, {}, (f) => released.push(f));
    now = 1000;
    for (let i = 0; i < 4; i += 1) p.push(i, 100 + i * FRAME); // a burst; delay ≈ 900 + 20 ms
    expect(p.next(1000)).toBeNull();          // none due yet: each waits for its own slot
    expect(p.next(1200)).toBe(3);             // all due by now: the newest is shown
    expect(released).toEqual([0, 1, 2]);
    expect(p.clear()).toEqual([]);
  });
});

describe('?livecam_playout switch', () => {
  it('capture by default; buffer brings back the fixed 24 fps buffer, remembered', () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(liveCamPlayoutMode('', s)).toBe('capture');
    expect(liveCamPlayoutMode('?livecam_playout=buffer', s)).toBe('buffer');
    expect(liveCamPlayoutMode('', s)).toBe('buffer');
    expect(liveCamPlayoutMode('?livecam_playout=capture', s)).toBe('capture');
    expect(liveCamPlayoutMode(undefined, undefined)).toBe('capture');
  });
});
