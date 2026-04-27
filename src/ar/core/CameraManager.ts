/**
 * Camera stream lifecycle management for the AR pipeline.
 *
 * Encapsulates getUserMedia acquisition, video element setup, and stream cleanup.
 *
 * R11: Falls back through a chain of progressively looser constraints if the
 *      first attempt fails with OverconstrainedError or NotReadableError.
 * R12: Pre-checks `navigator.permissions.query({ name: 'camera' })` when
 *      available, so we can surface "blocked" earlier than the browser's
 *      own permission prompt path.
 */

/** Result of a successful camera acquisition. */
export interface CameraResult {
  stream: MediaStream;
  videoWidth: number;
  videoHeight: number;
  /** Which constraint tier produced this stream (for diagnostics). */
  constraintTier: 'ideal' | 'fallback-720' | 'fallback-basic';
}

/** Ordered constraint chain: tries ideal first, then progressively relaxes. */
const CONSTRAINT_CHAIN: Array<{ tier: CameraResult['constraintTier']; constraints: MediaStreamConstraints }> = [
  {
    tier: 'ideal',
    constraints: {
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    },
  },
  {
    tier: 'fallback-720',
    constraints: {
      video: { facingMode: 'user', width: { max: 1280 }, height: { max: 720 } },
    },
  },
  {
    tier: 'fallback-basic',
    constraints: {
      video: { facingMode: 'user' },
    },
  },
];

/** Errors that warrant trying a looser constraint set. */
const RECOVERABLE_ERRORS = new Set(['OverconstrainedError', 'NotReadableError', 'AbortError']);

/**
 * R12: Optional permission pre-check. Returns 'denied' if the browser has a
 * persistent block, 'granted' if already approved, or 'prompt'/'unknown'
 * otherwise. Never throws — callers must still handle getUserMedia errors.
 */
export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return status.state as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'unknown';
  }
}

/**
 * Acquire a camera stream with constraint fallback.
 *
 * @throws DOMException with name 'NotAllowedError' / 'PermissionDeniedError'
 *         if the user denies permission (no fallback applies).
 * @throws DOMException with name 'NotFoundError' if no camera is present.
 * @throws The last error from the constraint chain if all tiers fail.
 */
export async function startCamera(video: HTMLVideoElement): Promise<CameraResult> {
  let lastErr: any = null;
  let acquired: { stream: MediaStream; tier: CameraResult['constraintTier'] } | null = null;

  for (const { tier, constraints } of CONSTRAINT_CHAIN) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      acquired = { stream, tier };
      break;
    } catch (err: any) {
      lastErr = err;
      const name = err?.name || '';
      // Permission denials and missing-device errors are terminal — no fallback helps.
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'NotFoundError' || name === 'SecurityError') {
        throw err;
      }
      if (!RECOVERABLE_ERRORS.has(name)) {
        // Unknown error — try the next tier anyway, but keep the original.
        console.warn(`[CameraManager] ${tier} failed with ${name}, trying next constraint set`, err);
      }
    }
  }

  if (!acquired) {
    throw lastErr ?? new Error('Camera acquisition failed for all constraint tiers');
  }

  video.srcObject = acquired.stream;
  await video.play();

  // Wait for video metadata so dimensions are available (10s ceiling).
  await new Promise<void>((resolve, reject) => {
    if (video.videoWidth > 0) { resolve(); return; }
    const timeout = setTimeout(
      () => reject(new Error('Camera metadata timeout — device took too long to initialize.')),
      10_000,
    );
    video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
  });

  return {
    stream: acquired.stream,
    videoWidth: video.videoWidth || window.innerWidth,
    videoHeight: video.videoHeight || window.innerHeight,
    constraintTier: acquired.tier,
  };
}

/** Stop all tracks on a camera stream. Safe with null. */
export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
