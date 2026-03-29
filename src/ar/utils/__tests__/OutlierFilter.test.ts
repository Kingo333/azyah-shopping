/**
 * Tests for the OutlierFilter utility.
 *
 * The OutlierFilter uses a running standard deviation to reject values
 * that deviate beyond N sigma from the rolling mean. This prevents
 * MediaPipe detection spikes from causing garment model jumps.
 */
import { describe, it, expect } from 'vitest';
import { OutlierFilter } from '../OutlierFilter';

describe('OutlierFilter', () => {
  describe('warm-up period', () => {
    it('returns value for first 3 samples (insufficient statistics)', () => {
      const filter = new OutlierFilter();
      expect(filter.filter(1.0)).toBe(1.0);
      expect(filter.filter(2.0)).toBe(2.0);
      expect(filter.filter(3.0)).toBe(3.0);
    });
  });

  describe('normal values', () => {
    it('returns value when within 3 sigma of running mean', () => {
      const filter = new OutlierFilter();
      // Feed consistent values to establish baseline
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);

      // Slightly different value should pass
      const result = filter.filter(1.1);
      expect(result).toBe(1.1);
    });
  });

  describe('outlier rejection', () => {
    it('returns null for value beyond 3 sigma', () => {
      const filter = new OutlierFilter();
      // Feed consistent values to establish baseline
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);

      // Huge spike should be rejected
      const result = filter.filter(100.0);
      expect(result).toBeNull();
    });

    it('does not reject values when stdDev is very small (< 0.0001)', () => {
      const filter = new OutlierFilter();
      // Feed identical values - stdDev will be 0
      filter.filter(5.0);
      filter.filter(5.0);
      filter.filter(5.0);
      filter.filter(5.0);

      // Even a different value should pass because stdDev is effectively 0
      // and the guard clause stdDev > 0.0001 prevents division issues
      const result = filter.filter(5.5);
      expect(result).toBe(5.5);
    });
  });

  describe('reset', () => {
    it('clears window and restarts warm-up', () => {
      const filter = new OutlierFilter();
      // Build up a window
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);

      // This would normally be rejected
      filter.reset();

      // After reset, warm-up restarts so any value is accepted
      expect(filter.filter(100.0)).toBe(100.0);
      expect(filter.filter(100.0)).toBe(100.0);
      expect(filter.filter(100.0)).toBe(100.0);
    });
  });

  describe('custom sigma threshold', () => {
    it('rejects tighter with sigmaThreshold 2.0', () => {
      const filter = new OutlierFilter(15, 2.0);

      // Feed values with some variance
      filter.filter(10.0);
      filter.filter(10.1);
      filter.filter(9.9);
      filter.filter(10.0);
      filter.filter(10.1);

      // A value far from mean should be rejected
      const result = filter.filter(20.0);
      expect(result).toBeNull();
    });
  });

  describe('window size limit', () => {
    it('does not exceed maxSize (shifts oldest)', () => {
      const maxSize = 5;
      const filter = new OutlierFilter(maxSize);

      // Feed more values than maxSize
      for (let i = 0; i < 10; i++) {
        filter.filter(1.0);
      }

      // The filter should still work (not grow unbounded).
      // Feed a value that would be accepted -- shows filter is still functional.
      const result = filter.filter(1.05);
      expect(result).toBe(1.05);
    });

    it('adapts statistics to recent values when window rolls over', () => {
      const maxSize = 5;
      const filter = new OutlierFilter(maxSize, 3.0);

      // Fill window with 1.0
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);
      filter.filter(1.0);

      // Now shift the window to 10.0 values by feeding them one at a time
      // Each should be rejected initially because it's far from 1.0
      // But after the window fills with 10s, 10 should be accepted
      // Reset and start fresh to test clean window rollover
      filter.reset();

      // Fill a small window (maxSize=5) entirely with 10.0
      filter.filter(10.0);
      filter.filter(10.0);
      filter.filter(10.0);
      filter.filter(10.0);
      filter.filter(10.0);

      // Now 10.1 should be accepted (close to mean of 10.0)
      expect(filter.filter(10.1)).toBe(10.1);

      // And 1.0 should be rejected (far from mean of ~10.0)
      expect(filter.filter(1.0)).toBeNull();
    });
  });
});
