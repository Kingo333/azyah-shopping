import { describe, expect, it } from 'vitest';
import { formatElapsed, warmupProgress } from './liveWarmup';

describe('warmupProgress', () => {
  it('starts at zero', () => {
    expect(warmupProgress(0)).toBe(0);
  });
  it('reaches about 80% at the typical 30 seconds', () => {
    expect(warmupProgress(30_000)).toBeCloseTo(0.8, 5);
  });
  it('keeps creeping after that but never claims done', () => {
    const a = warmupProgress(60_000);
    const b = warmupProgress(120_000);
    expect(a).toBeGreaterThan(0.8);
    expect(b).toBeGreaterThan(a);
    expect(warmupProgress(10 * 60_000)).toBeLessThanOrEqual(0.95);
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
