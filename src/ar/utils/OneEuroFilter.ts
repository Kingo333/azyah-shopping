/**
 * One Euro Filter -- Adaptive low-pass filter for real-time signal smoothing.
 *
 * Implements the algorithm from:
 * Casiez, G., Roussel, N., & Vogel, D. (2012).
 * "1 Euro Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems"
 * CHI 2012. https://gery.casiez.net/1euro/
 *
 * The filter adapts its cutoff frequency based on the speed of the input signal:
 * - Slow movement (jitter) -> lower cutoff -> more smoothing
 * - Fast movement (intentional) -> higher cutoff -> less smoothing (less lag)
 *
 * Two intuitive tuning parameters:
 * - `minCutoff`: Minimum cutoff frequency (Hz). Higher = less smoothing at rest. Default 1.0.
 * - `beta`: Speed coefficient. Higher = less lag during fast movement. Default 0.007.
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number;
  private dxPrev: number;
  private tPrev: number;
  private initialized: boolean;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = 0;
    this.dxPrev = 0;
    this.tPrev = 0;
    this.initialized = false;
  }

  /**
   * Compute the exponential smoothing factor alpha for a given time elapsed and cutoff frequency.
   */
  private alpha(tE: number, cutoff: number): number {
    const r = 2 * Math.PI * cutoff * tE;
    return r / (r + 1);
  }

  /**
   * Filter a new sample value.
   *
   * @param x - The raw input value to filter.
   * @param timestamp - The timestamp of the sample **in seconds** (not milliseconds).
   *   When using `requestAnimationFrame`, convert: `timestamp / 1000`.
   * @returns The filtered (smoothed) value.
   */
  filter(x: number, timestamp: number): number {
    if (!this.initialized) {
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = timestamp;
      this.initialized = true;
      return x;
    }

    const tE = timestamp - this.tPrev;
    if (tE <= 0) return this.xPrev;

    // Derivative estimation with low-pass filter
    const aD = this.alpha(tE, this.dCutoff);
    const dx = (x - this.xPrev) / tE;
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    // Adaptive cutoff: more smoothing at low speed, less at high speed
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(tE, cutoff);

    // Filtered value
    const xHat = a * x + (1 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = timestamp;

    return xHat;
  }

  /**
   * Reset the filter state. Call when switching products or re-initializing
   * to avoid smoothing across discontinuous signals.
   */
  reset(): void {
    this.initialized = false;
  }
}

/**
 * Recommended parameter presets for AR garment overlay smoothing.
 *
 * - `position`: Moderate smoothing, responsive to movement (for x, y coordinates)
 * - `scale`: Heavy smoothing, scale should not jitter (for scaleX, scaleY, scaleZ)
 * - `rotation`: Moderate smoothing (for body-turn rotation)
 */
export const FILTER_PRESETS = {
  position: { minCutoff: 1.0, beta: 0.007, dCutoff: 1.0 },
  scale: { minCutoff: 0.5, beta: 0.001, dCutoff: 1.0 },
  rotation: { minCutoff: 0.8, beta: 0.004, dCutoff: 1.0 },
} as const;
