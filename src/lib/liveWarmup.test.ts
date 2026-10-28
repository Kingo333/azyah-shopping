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
