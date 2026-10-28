// Live Cam start-up: a progress estimate while the GPU warms up. We say about
// 50 seconds. The bar moves fast at first (strong ease-out, ~75% by 25 s, 80% by 50 s), then
// slows between 80% and 95% until it's actually ready; it never says done early.

export const TYPICAL_WARMUP_MS = 50_000;

export function warmupProgress(elapsedMs: number, typicalMs = TYPICAL_WARMUP_MS): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (elapsedMs <= typicalMs) {
    const t = elapsedMs / typicalMs;
    return 0.8 * (1 - (1 - t) ** 4);
  }
  const extra = (elapsedMs - typicalMs) / typicalMs;
  return Math.min(0.95, 0.8 + 0.15 * (1 - Math.exp(-extra / 2)));
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
