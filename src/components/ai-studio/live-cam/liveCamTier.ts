// Per-tier client settings and error-code helpers for Live Cam.

import type { LiveCamTier } from './liveCamTypes';

export interface LiveCamTierConfig {
  /** Frame size sent to the GPU worker (and the output canvas size). */
  captureWidth: number;
  captureHeight: number;
  fpsCap: number;
  /** How long to wait for the GPU worker to become ready. */
  warmupTimeoutMs: number;
  warmupLabel: string;
}

export const LIVE_CAM_TIER_CONFIG: Record<LiveCamTier, LiveCamTierConfig> = {
  standard: {
    captureWidth: 288,
    captureHeight: 512,
    fpsCap: 12,
    warmupTimeoutMs: 180_000,
    warmupLabel: 'Warming up GPU… up to 3 min',
  },
  // Placeholders until JoyAI is live: same capture size as Standard.
  premium: {
    captureWidth: 288,
    captureHeight: 512,
    fpsCap: 12,
    warmupTimeoutMs: 300_000,
    warmupLabel: 'Warming up Premium GPU… this can take a few minutes',
  },
};

export const LIVE_CAM_ERROR_CODES = [
  'premium_required',
  'premium_disabled',
  'premium_not_configured',
  'invalid_tier',
  'runpod_no_capacity',
  'runpod_create_failed',
] as const;
export type LiveCamErrorCode = (typeof LIVE_CAM_ERROR_CODES)[number];

/** Premium is unavailable for everyone right now (not an account problem). */
export function isPremiumUnavailable(code: string | null | undefined): boolean {
  return code === 'premium_disabled' || code === 'premium_not_configured';
}

/** The Premium selector is shown unless VITE_LIVE_CAM_PREMIUM_UI is exactly "false". */
export function isPremiumUiEnabled(flag: string | undefined = import.meta.env?.VITE_LIVE_CAM_PREMIUM_UI): boolean {
  return (flag ?? '').trim().toLowerCase() !== 'false';
}

export interface FunctionErrorDetails {
  code: string | null;
  message: string | null;
}

/**
 * supabase.functions.invoke() hides the body of non-2xx responses behind
 * error.context (a fetch Response). Read { code, error } from it.
 */
export async function readFunctionError(error: unknown): Promise<FunctionErrorDetails> {
  const fallback = error instanceof Error ? error.message : null;
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).json !== 'function') {
    return { code: null, message: fallback };
  }
  try {
    const res = ctx as Response;
    const body = await (typeof res.clone === 'function' ? res.clone() : res).json();
    const code = typeof body?.code === 'string' ? body.code : null;
    const message = typeof body?.error === 'string' ? body.error : fallback;
    return { code, message };
  } catch {
    return { code: null, message: fallback };
  }
}
