// Live try-on start-up: a progress estimate while the GPU warms up. We tell shoppers about
// 2-5 minutes for a first (cold) start, so the bar reaches 80% at 3 minutes (strong ease-out
// before that), then slows between 80% and 95% until it's actually ready; it never says done
// early. A warm worker is ready much sooner and the bar simply jumps to the live view.

export const TYPICAL_WARMUP_MS = 180_000;

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
