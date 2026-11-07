// Client settings and error-code helpers for Live Try-On.
// There is one mode for everyone (no Standard / Premium tiers): the RunPod endpoint decides
// the engine (JoyAI or FluxRT) and its ready message says which frames it wants.

export interface LiveCamConfig {
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
  /** Worker hint (ready.playback_buffer): draw frames through the jitter buffer. Off unless set. */
  playbackBuffer?: boolean;
  /** Worker hint (ready.playback_fps): fixed presentation rate for the buffer. */
  playbackFps?: number;
  /** Frames the buffer may hold, and the number it aims to hold (see PlaybackOptions). */
  playbackMaxBuffer?: number;
  playbackTargetBuffer?: number;
}

/**
 * How long a start may take before it fails. A cold start (a fresh GPU worker) takes
 * about 2-5 minutes for either engine; the first start after a new image can take up to
 * about 15 (image pull + kernel compile). Shoppers can cancel at any time.
 */
export const LIVE_CAM_WARMUP_TIMEOUT_MS = 15 * 60_000;

/** Settings until the worker's ready hints arrive (old workers send none: FluxRT model size). */
export const LIVE_CAM_CONFIG: LiveCamConfig = {
  captureWidth: 288,
  captureHeight: 512,
  fpsCap: 12,
  jpegQuality: 0.7,
  warmupTimeoutMs: LIVE_CAM_WARMUP_TIMEOUT_MS,
  warmupLabel: 'Preparing your mirror… about 2–5 minutes the first time',
};

/**
 * The worker's "ready" message says which frames it wants
 * ({engine: "joyai" | "fluxrt", input_width, input_height, input_fps, input_jpeg_quality,
 * and for FluxRT output_width/output_height}).
 * The endpoint decides the engine, so these always win.
 * Older workers send no engine field, so the defaults are kept.
 */
export function applyEngineHints(cfg: LiveCamConfig, ready: Record<string, unknown>): LiveCamConfig {
  if (ready?.engine !== 'joyai' && ready?.engine !== 'fluxrt') return cfg;
  const num = (v: unknown, min: number, max: number): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
  const w = num(ready.input_width, 128, 1920);
  const h = num(ready.input_height, 128, 1920);
  const fps = num(ready.input_fps, 1, 30);
  const q = num(ready.input_jpeg_quality, 0.3, 1);
  const ow = num(ready.output_width, 128, 2048);
  const oh = num(ready.output_height, 128, 2048);
  // Optional app-side jitter buffer hints: playback_buffer (boolean), playback_fps (number).
  const playbackFps = num(ready.playback_fps, 1, 60);
  // JoyAI sends its output in chunks of 8 frames every ~0.3 s. Drawn as they arrive, that is
  // ~3 visible jumps a second. Unless the worker says otherwise, buffer up to two chunks and
  // play them at JoyAI's own rate (input_fps, 24), aiming to hold one chunk (~0.3 s delay).
  if (ready.engine === 'joyai' && typeof ready.playback_buffer !== 'boolean') {
    const rate = playbackFps ?? fps ?? 24;
    return {
      ...applyEngineHints(cfg, { ...ready, playback_buffer: true, playback_fps: rate }),
      playbackMaxBuffer: 16,
      playbackTargetBuffer: 8,
    };
  }
  return {
    ...cfg,
    captureWidth: w !== null && h !== null ? Math.round(w) : cfg.captureWidth,
    captureHeight: w !== null && h !== null ? Math.round(h) : cfg.captureHeight,
    fpsCap: fps ?? cfg.fpsCap,
    jpegQuality: q ?? cfg.jpegQuality,
    outputWidth: ow !== null && oh !== null ? Math.round(ow) : cfg.outputWidth,
    outputHeight: ow !== null && oh !== null ? Math.round(oh) : cfg.outputHeight,
    playbackBuffer: typeof ready.playback_buffer === 'boolean' ? ready.playback_buffer : cfg.playbackBuffer,
    playbackFps: playbackFps ?? cfg.playbackFps,
  };
}

/**
 * Source rectangle that center-crops a camera frame to the capture aspect ratio,
 * so a landscape camera isn't squeezed into a portrait frame (faces looked thin).
 */
/** Canvas size for the worker's frames: its output size if it sent one, else the capture size. */
export function outputCanvasSize(cfg: LiveCamConfig): { width: number; height: number } {
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

/** Why a start was interrupted before it finished. */
export type StartStopReason = 'user' | 'timeout' | null;

/**
 * What the screen shows when a start throws. An internal 'aborted' (from cancelling or
 * from the start timeout) must never reach shoppers as an error message:
 * - cancelled by the shopper: status 'ended', no message;
 * - timed out: status 'failed', keep the timeout's own message (message: undefined = leave as is);
 * - anything else: status 'failed' with the error's message.
 */
export function startFailureOutcome(
  message: string,
  reason: StartStopReason,
): { status: 'ended' | 'failed'; message: string | null | undefined } {
  if (message === 'aborted' && reason === 'user') return { status: 'ended', message: null };
  if (message === 'aborted' && reason === 'timeout') return { status: 'failed', message: undefined };
  return { status: 'failed', message };
}

export const LIVE_CAM_ERROR_CODES = [
  'runpod_no_capacity',
  'runpod_create_failed',
] as const;
export type LiveCamErrorCode = (typeof LIVE_CAM_ERROR_CODES)[number];

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
