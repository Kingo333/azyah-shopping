// Live Cam start-up: an honest progress estimate while the GPU warms up.
// Typically about 30 s; the first start of the day can take a few minutes.

export const TYPICAL_WARMUP_MS = 30_000;

/** 0 → 0.8 by the typical time, then creeps toward 0.95; never "done" before it is. */
export function warmupProgress(elapsedMs: number, typicalMs = TYPICAL_WARMUP_MS): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (elapsedMs <= typicalMs) return 0.8 * (elapsedMs / typicalMs);
  const extra = (elapsedMs - typicalMs) / typicalMs;
  return Math.min(0.95, 0.8 + 0.15 * (1 - Math.exp(-extra / 3)));
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
