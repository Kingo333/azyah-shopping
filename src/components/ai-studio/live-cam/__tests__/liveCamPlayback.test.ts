import { describe, expect, it } from 'vitest';
import { PlaybackScheduler, resolvePlaybackMode } from '../liveCamPlayback';

/** Fake clock plus a helper that drives next() at a display refresh rate. */
function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

function present<T>(s: PlaybackScheduler<T>, c: ReturnType<typeof clock>, untilMs: number, stepMs = 1000 / 60): { t: number; frame: T }[] {
  const out: { t: number; frame: T }[] = [];
  while (c.now() < untilMs) {
    const f = s.next(c.now());
    if (f !== null) out.push({ t: c.now(), frame: f });
    c.advance(stepMs);
  }
  return out;
}

describe('PlaybackScheduler', () => {
  it('presents a steady 30 fps input at a steady cadence with no drops', () => {
    const c = clock();
    const dropped: number[] = [];
    const s = new PlaybackScheduler<number>(c.now, {}, (f) => dropped.push(f));
    const shown: number[] = [];
    for (let i = 0; i < 60; i++) {
      s.push(i);
      // display ticks between arrivals
      for (let k = 0; k < 2; k++) {
        const f = s.next(c.now());
        if (f !== null) shown.push(f);
        c.advance(1000 / 60);
      }
    }
    expect(dropped).toEqual([]);
    expect(shown.length).toBeGreaterThanOrEqual(55);
    expect(shown).toEqual([...shown].sort((a, b) => a - b)); // in order
    expect(Math.abs(s.intervalMs() - 1000 / 30)).toBeLessThan(2);
  });

  it('smooths bursty input: 4 frames at once come out spaced, with a bounded buffer', () => {
    const c = clock();
    const dropped: number[] = [];
    const s = new PlaybackScheduler<number>(c.now, { maxBuffer: 2 }, (f) => dropped.push(f));
    // Measured rate first: 4 frames every 100 ms (interpolation bursts) => ~40 fps overall.
    let n = 0;
    const times: number[] = [];
    for (let burst = 0; burst < 10; burst++) {
      for (let k = 0; k < 4; k++) {
        s.push(n++);
        c.advance(2); // the 4 frames land within 8 ms
      }
      // display ticks until the next burst
      const start = c.now();
      while (c.now() < start + 92) {
        const f = s.next(c.now());
        if (f !== null) times.push(c.now());
        c.advance(1000 / 60);
      }
    }
    // Never more than maxBuffer frames waiting.
    expect(s.snapshot().buffered).toBeLessThanOrEqual(2);
    // The burst was turned into spaced presentations, not a single catch-up at the end.
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    expect(Math.max(...gaps)).toBeLessThan(150);
    expect(dropped.length).toBeGreaterThan(0); // 4-frame bursts into a 2-frame buffer
    expect(dropped.length + times.length).toBeLessThanOrEqual(40);
  });

  it('drops the oldest frame when the buffer is full and catches up at once', () => {
    const c = clock();
    const dropped: number[] = [];
    const s = new PlaybackScheduler<number>(c.now, { maxBuffer: 2 }, (f) => dropped.push(f));
    s.push(1); s.push(2); s.push(3);
    expect(dropped).toEqual([1]);
    expect(s.snapshot().buffered).toBe(2);
    expect(s.dueIn(c.now())).toBe(0); // full buffer => present now
    expect(s.next(c.now())).toBe(2);
    c.advance(1);
    expect(s.next(c.now())).toBeNull(); // the cadence applies again once the buffer is short
  });

  it('follows a rate change: 10 fps input then 30 fps input', () => {
    const c = clock();
    const s = new PlaybackScheduler<number>(c.now);
    for (let i = 0; i < 20; i++) { s.push(i); c.advance(100); }
    expect(Math.abs(s.intervalMs() - 100)).toBeLessThan(5);
    for (let i = 0; i < 60; i++) { s.push(i); c.advance(1000 / 30); }
    expect(Math.abs(s.intervalMs() - 1000 / 30)).toBeLessThan(4);
  });

  it('ignores stalls (gaps over a second) in the rate estimate and clamps to 8-60 fps', () => {
    const c = clock();
    const s = new PlaybackScheduler<number>(c.now);
    s.push(0); c.advance(50); s.push(1); c.advance(5000); s.push(2);
    expect(Math.abs(s.intervalMs() - 50)).toBeLessThan(1);
    const slow = new PlaybackScheduler<number>(c.now);
    slow.push(0); c.advance(900); slow.push(1);
    expect(slow.intervalMs()).toBe(125); // clamped at 8 fps
    const fast = new PlaybackScheduler<number>(c.now);
    fast.push(0); c.advance(1); fast.push(1);
    expect(Math.abs(fast.intervalMs() - 1000 / 60)).toBeLessThan(0.01);
  });

  it('a fixed fps hint overrides the estimate', () => {
    const c = clock();
    const s = new PlaybackScheduler<number>(c.now, { fixedFps: 24 });
    s.push(0); c.advance(10); s.push(1);
    expect(Math.abs(s.intervalMs() - 1000 / 24)).toBeLessThan(0.01);
    expect(s.snapshot().intervalMs).toBe(41.7);
  });

  it('added delay stays within about one interval', () => {
    const c = clock();
    const s = new PlaybackScheduler<{ id: number; at: number }>(c.now);
    const delays: number[] = [];
    for (let i = 0; i < 90; i++) {
      s.push({ id: i, at: c.now() });
      for (let k = 0; k < 2; k++) {
        const f = s.next(c.now());
        if (f !== null) delays.push(c.now() - f.at);
        c.advance(1000 / 60);
      }
    }
    const sorted = [...delays].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length * 0.95)]).toBeLessThanOrEqual(70);
  });

  it('clear() returns the buffered frames and resets', () => {
    const c = clock();
    const s = new PlaybackScheduler<number>(c.now);
    s.push(1); s.push(2);
    expect(s.clear()).toEqual([1, 2]);
    expect(s.next(c.now())).toBeNull();
    expect(s.snapshot()).toEqual({ framesPresented: 0, framesDropped: 0, buffered: 0, intervalMs: null });
  });
});

describe('resolvePlaybackMode', () => {
  it('override > worker hint > off', () => {
    expect(resolvePlaybackMode(null, undefined)).toBe(false);
    expect(resolvePlaybackMode(null, true)).toBe(true);
    expect(resolvePlaybackMode(null, false)).toBe(false);
    expect(resolvePlaybackMode('on', false)).toBe(true);
    expect(resolvePlaybackMode('off', true)).toBe(false);
  });
});

describe('PlaybackScheduler: JoyAI chunks (8 frames every ~0.31 s)', () => {
  // Simulates the phone's display loop (60 Hz ticks) and JoyAI's delivery: a chunk of 8
  // frames arriving within a few ms, every `periodMs` (±jitter), for `seconds`.
  function run(periodMs: number, seconds: number, jitterMs = 0) {
    let t = 0;
    const s = new PlaybackScheduler<number>(() => t, { fixedFps: 24, maxBuffer: 16, targetBuffer: 8 });
    const presents: number[] = [];
    let id = 0;
    let nextChunk = 0;
    let k = 0;
    for (t = 0; t <= seconds * 1000; t += 1000 / 60) {
      while (t >= nextChunk) {
        for (let i = 0; i < 8; i++) s.push(id++);
        k += 1;
        const j = jitterMs ? ((k * 7919) % (2 * jitterMs)) - jitterMs : 0; // deterministic jitter
        nextChunk += periodMs + j;
      }
      if (s.next(t) !== null) presents.push(t);
    }
    const gaps = presents.slice(1).map((p, i) => p - presents[i]);
    const settled = gaps.slice(Math.floor(gaps.length / 3)); // after the first ~third
    return { s, presents, gaps: settled, sent: id };
  }

  it('turns 3 bursts a second into an even ~24 fps, without dropping frames', () => {
    const { s, gaps, sent } = run(314, 30); // 25.5 fps in, a little faster than 24
    expect(s.snapshot().framesDropped).toBe(0);
    expect(s.snapshot().framesPresented).toBeGreaterThan(sent - 17);
    // No visible jumps: every gap is one or two display ticks (16.7 or 33.3 ms).
    expect(Math.max(...gaps)).toBeLessThanOrEqual(50.1);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(1000 / mean).toBeGreaterThan(22);
    expect(1000 / mean).toBeLessThan(28);
  });

  it('holds about one chunk, so the added delay stays near 0.3 s', () => {
    const { s } = run(314, 30);
    expect(s.snapshot().buffered).toBeLessThanOrEqual(12);
  });

  it('copes with a producer slightly slower than 24 fps and with arrival jitter', () => {
    const slow = run(350, 30, 60); // ~22.9 fps in, chunks ±60 ms late or early
    expect(slow.s.snapshot().framesDropped).toBe(0);
    // A few longer gaps are allowed when a chunk is late, but no freezes over 0.2 s.
    expect(Math.max(...slow.gaps)).toBeLessThan(200);
  });
});
