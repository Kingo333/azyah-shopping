import { describe, expect, it } from 'vitest';
import { TYPICAL_WARMUP_MS, formatElapsed, warmupProgress } from './liveWarmup';

describe('warmupProgress', () => {
  it('says about 50 seconds', () => {
    expect(TYPICAL_WARMUP_MS).toBe(50_000);
  });
  it('starts at zero', () => {
    expect(warmupProgress(0)).toBe(0);
  });
  it('moves fast at the start: past 40% in the first fifth of the wait', () => {
    expect(warmupProgress(10_000)).toBeGreaterThan(0.4);
  });
  it('reaches 80% at the typical 50 seconds', () => {
    expect(warmupProgress(50_000)).toBeCloseTo(0.8, 5);
  });
  it('slows down between 80% and 95% and never claims done', () => {
    const a = warmupProgress(60_000);
    const b = warmupProgress(120_000);
    const c = warmupProgress(10 * 60_000);
    expect(a).toBeGreaterThan(0.8);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeLessThanOrEqual(0.95);
    // The second 10 s past 50 s adds less than the first 10 s of the wait.
    expect(warmupProgress(60_000) - warmupProgress(50_000)).toBeLessThan(warmupProgress(10_000));
  });
  it('treats bad input as zero', () => {
    expect(warmupProgress(-5)).toBe(0);
    expect(warmupProgress(Number.NaN)).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('shows minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7_400)).toBe('0:07');
    expect(formatElapsed(95_000)).toBe('1:35');
  });
});

import { parseWarming, warmupView } from './liveWarmup';

describe('worker warm-up progress', () => {
  it('parses progress and ignores old workers', () => {
    expect(parseWarming({ type: 'warming', state: {} }, 0)).toBeNull();
    const w = parseWarming({ type: 'warming', engine: 'joyai', phase: 'loading', elapsed_s: 42, expected_s: 180 }, 1000);
    expect(w).toEqual({ engine: 'joyai', phase: 'loading', elapsedS: 42, expectedS: 180, receivedAt: 1000 });
    expect(parseWarming({ type: 'warming', elapsed_s: 5, expected_s: 99999 }, 0)?.expectedS).toBeNull();
  });
  it('waits for a GPU first, then follows the worker clock and typical time', () => {
    const before = warmupView(null, 0, 20_000);
    expect(before.label).toBe('Finding a free GPU…');
    expect(before.elapsedMs).toBe(20_000);
    const info = parseWarming({ type: 'warming', engine: 'joyai', phase: 'loading', elapsed_s: 60, expected_s: 180 }, 30_000)!;
    const v = warmupView(info, 0, 33_000);
    expect(v.label).toBe('Loading the try-on model…');
    expect(v.elapsedMs).toBe(63_000);
    expect(v.typicalMs).toBe(180_000);
    expect(v.typicalLabel).toBe('Usually about 3 minutes.');
    expect(warmupView({ ...info, phase: 'booting' }, 0, 33_000).label).toBe('Starting the try-on engine…');
  });
});
