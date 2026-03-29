/**
 * Running standard deviation outlier rejection filter.
 *
 * Maintains a sliding window of recent values and rejects new values
 * that deviate beyond a configurable number of standard deviations
 * from the running mean. This catches MediaPipe detection spikes
 * (sudden jumps in landmark positions) before they reach the
 * One Euro Filter or anchor strategy computation.
 *
 * Design choices:
 * - 3-sample warm-up: insufficient statistics to compute meaningful std-dev
 * - 3.0 sigma default: catches genuine spikes while allowing fast movements
 * - Window of 15 samples (~0.5s at 30fps): balances responsiveness and stability
 * - Applied BEFORE One Euro Filter in the pipeline
 *
 * @see 03-RESEARCH.md Pitfall 3 for sigma threshold rationale
 */
export class OutlierFilter {
  private window: number[] = [];
  private readonly maxSize: number;
  private readonly sigmaThreshold: number;

  /**
   * @param maxSize - Maximum number of samples in the rolling window (default 15).
   * @param sigmaThreshold - Number of standard deviations beyond which a value is rejected (default 3.0).
   */
  constructor(maxSize = 15, sigmaThreshold = 3.0) {
    this.maxSize = maxSize;
    this.sigmaThreshold = sigmaThreshold;
  }

  /**
   * Filter a new sample value.
   *
   * @param value - The raw input value to check.
   * @returns The value if within bounds, or null if it is an outlier (caller should use last known good value).
   */
  filter(value: number): number | null {
    // Warm-up: accept first 3 samples (insufficient statistics for std-dev)
    if (this.window.length < 3) {
      this.window.push(value);
      return value;
    }

    // Compute running mean and standard deviation
    const mean = this.window.reduce((s, v) => s + v, 0) / this.window.length;
    const variance =
      this.window.reduce((s, v) => s + (v - mean) ** 2, 0) / this.window.length;
    const stdDev = Math.sqrt(variance);

    // Guard: if stdDev is effectively zero, skip outlier check
    // (all values identical -- any new value is fine)
    if (stdDev > 0.0001 && Math.abs(value - mean) > this.sigmaThreshold * stdDev) {
      return null; // Outlier -- caller should use previous value
    }

    // Accept the value and add to window
    this.window.push(value);
    if (this.window.length > this.maxSize) {
      this.window.shift();
    }
    return value;
  }

  /**
   * Reset the filter state. Call when switching products or re-initializing
   * to avoid rejecting values from a new signal against the old signal's statistics.
   */
  reset(): void {
    this.window = [];
  }
}
