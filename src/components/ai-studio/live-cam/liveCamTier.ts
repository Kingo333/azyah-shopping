// Per-tier client settings and error-code helpers for Live Cam.

import type { LiveCamTier } from './liveCamTypes';

export interface LiveCamTierConfig {
  /** Frame size sent to the GPU worker (and the output canvas size). */
  captureWidth: number;
  captureHeight: number;
  fpsCap: number;
  /** JPEG quality (0-1) of the camera frames sent to the worker. */
  jpegQuality: number;
  /** Size of the frames the worker sends back, when it differs from the capture
   * size (FluxRT's Flow Upscaler returns 2x). The output canvas uses it. */
  outputWidth?: number;
  outputHeight?: number;
  /** How long to wait for the GPU worker to become ready. */
  warmupTimeoutMs: number;
  warmupLabel: string;
}

export const LIVE_CAM_TIER_CONFIG: Record<LiveCamTier, LiveCamTierConfig> = {
  standard: {
    captureWidth: 288,
    captureHeight: 512,
    fpsCap: 12,
    jpegQuality: 0.7,
    warmupTimeoutMs: 180_000,
    warmupLabel: 'Warming up GPU… up to 3 min',
  },
  // JoyAI works at 480x840, 24 fps. Smaller frames get upscaled and lose face and garment detail.
  premium: {
    captureWidth: 480,
    captureHeight: 840,
    fpsCap: 24,
    jpegQuality: 0.85,
    warmupTimeoutMs: 300_000,
    warmupLabel: 'Warming up Premium GPU… this can take a few minutes',
  },
};

/**
 * The worker's "ready" message says which frames it wants
 * ({engine: "joyai" | "fluxrt", input_width, input_height, input_fps, input_jpeg_quality,
 * and for FluxRT output_width/output_height}).
 * Use them whatever tier was requested, because the endpoint decides the engine.
 * Older workers send no engine field, so the tier config is kept.
 */
export function applyEngineHints(cfg: LiveCamTierConfig, ready: Record<string, unknown>): LiveCamTierConfig {
  if (ready?.engine !== 'joyai' && ready?.engine !== 'fluxrt') return cfg;
  const num = (v: unknown, min: number, max: number): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
  const w = num(ready.input_width, 128, 1920);
  const h = num(ready.input_height, 128, 1920);
  const fps = num(ready.input_fps, 1, 30);
  const q = num(ready.input_jpeg_quality, 0.3, 1);
  const ow = num(ready.output_width, 128, 2048);
  const oh = num(ready.output_height, 128, 2048);
  return {
    ...cfg,
    captureWidth: w !== null && h !== null ? Math.round(w) : cfg.captureWidth,
    captureHeight: w !== null && h !== null ? Math.round(h) : cfg.captureHeight,
    fpsCap: fps ?? cfg.fpsCap,
    jpegQuality: q ?? cfg.jpegQuality,
    outputWidth: ow !== null && oh !== null ? Math.round(ow) : cfg.outputWidth,
    outputHeight: ow !== null && oh !== null ? Math.round(oh) : cfg.outputHeight,
  };
}

/**
 * Source rectangle that center-crops a camera frame to the capture aspect ratio,
 * so a landscape camera isn't squeezed into a portrait frame (faces looked thin).
 */
/** Canvas size for the worker's frames: its output size if it sent one, else the capture size. */
export function outputCanvasSize(cfg: LiveCamTierConfig): { width: number; height: number } {
  return { width: cfg.outputWidth ?? cfg.captureWidth, height: cfg.outputHeight ?? cfg.captureHeight };
}

export function coverCropRect(
  videoWidth: number,
  videoHeight: number,
  targetWidth: number,
  targetHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (videoWidth <= 0 || videoHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(0, videoWidth), sh: Math.max(0, videoHeight) };
  }
  const target = targetWidth / targetHeight;
  if (videoWidth / videoHeight > target) {
    const sw = videoHeight * target;
    return { sx: (videoWidth - sw) / 2, sy: 0, sw, sh: videoHeight };
  }
  const sh = videoWidth / target;
  return { sx: 0, sy: (videoHeight - sh) / 2, sw: videoWidth, sh };
}

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
