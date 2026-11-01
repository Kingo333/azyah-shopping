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

/** Progress the worker reports in its "warming" messages (FluxRT and JoyAI, Nov 2026+). */
export interface WarmupInfo {
  engine: string | null;
  /** booting = starting the engine, loading = reading weights and warming up. */
  phase: string | null;
  /** Seconds since the worker began loading, when the message arrived. */
  elapsedS: number;
  /** Typical total for this engine (JoyAI about 180 s). */
  expectedS: number | null;
  receivedAt: number;
}

export function parseWarming(msg: Record<string, unknown>, now: number): WarmupInfo | null {
  if (msg?.type !== 'warming') return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const elapsed = num(msg.elapsed_s);
  if (elapsed === null) return null; // older workers send no progress
  const expected = num(msg.expected_s);
  return {
    engine: typeof msg.engine === 'string' ? msg.engine : null,
    phase: typeof msg.phase === 'string' ? msg.phase : null,
    elapsedS: elapsed,
    expectedS: expected !== null && expected >= 10 && expected <= 1800 ? expected : null,
    receivedAt: now,
  };
}

export interface WarmupView {
  elapsedMs: number;
  typicalMs: number;
  /** Step shown to the shopper. */
  label: string;
  /** "Usually about 3 minutes." */
  typicalLabel: string;
}

function aboutLabel(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 90) return `Usually about ${Math.max(10, Math.round(s / 10) * 10)} seconds.`;
  const min = Math.round(s / 60);
  return `Usually about ${min} minute${min === 1 ? '' : 's'}.`;
}

/**
 * What the loading card shows. Before the worker answers we are waiting for a GPU;
 * after that the worker's own clock and typical time drive the bar, so it matches
 * the engine (JoyAI is about 3 minutes, not the old 50-second guess).
 */
export function warmupView(info: WarmupInfo | null, startedAt: number | null, now: number, fallbackTypicalMs = TYPICAL_WARMUP_MS): WarmupView {
  const sinceStart = startedAt !== null ? Math.max(0, now - startedAt) : 0;
  if (!info) {
    return { elapsedMs: sinceStart, typicalMs: fallbackTypicalMs, label: 'Finding a free GPU…', typicalLabel: aboutLabel(fallbackTypicalMs) };
  }
  const typicalMs = info.expectedS !== null ? info.expectedS * 1000 : fallbackTypicalMs;
  // The worker's elapsed time (it may already have been loading for another shopper) plus time since.
  const elapsedMs = Math.max(sinceStart, info.elapsedS * 1000 + Math.max(0, now - info.receivedAt));
  const label = info.phase === 'loading' ? 'Loading the try-on model…' : 'Starting the try-on engine…';
  return { elapsedMs, typicalMs, label, typicalLabel: aboutLabel(typicalMs) };
}
