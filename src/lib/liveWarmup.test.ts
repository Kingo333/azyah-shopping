import { describe, expect, it } from 'vitest';
import { TYPICAL_WARMUP_MS, formatElapsed, warmupProgress } from './liveWarmup';

describe('warmupProgress', () => {
  it('assumes a 3 minute cold start (we tell shoppers 2–5 minutes)', () => {
    expect(TYPICAL_WARMUP_MS).toBe(180_000);
  });
  it('starts at zero', () => {
    expect(warmupProgress(0)).toBe(0);
  });
  it('moves fast at the start: past 40% in the first fifth of the wait', () => {
    expect(warmupProgress(36_000)).toBeGreaterThan(0.4);
  });
  it('reaches 80% at the typical 3 minutes', () => {
    expect(warmupProgress(180_000)).toBeCloseTo(0.8, 5);
  });
  it('slows down between 80% and 95% and never claims done', () => {
    const a = warmupProgress(4 * 60_000);
    const b = warmupProgress(6 * 60_000);
    const c = warmupProgress(15 * 60_000);
    expect(a).toBeGreaterThan(0.8);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeLessThanOrEqual(0.95);
    // The 36 s after 3 minutes add less than the first 36 s of the wait.
    expect(warmupProgress(216_000) - warmupProgress(180_000)).toBeLessThan(warmupProgress(36_000));
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
