/**
 * Shared MediaPipe WASM runtime — downloaded once, reused by all tasks.
 *
 * Both PoseProcessor and BodySegmenter need the same WASM fileset from CDN.
 * This module ensures it's only downloaded once (saves ~3MB on first load).
 *
 * Phase A6/A7 hardening:
 * - HEAD preflight on the WASM .js entry before invoking FilesetResolver, so a
 *   blocked/typo'd CDN path fails fast instead of hanging silently inside
 *   FilesetResolver.forVisionTasks() (the most common cause of "stuck on
 *   Starting AR..." in field reports).
 * - One automatic retry after a 1.5s backoff on the first failure (covers
 *   transient mobile network drops without making the user re-tap "retry").
 *
 * The CDN URL MUST stay version-pinned to match `@mediapipe/tasks-vision` in
 * package.json. Do NOT use @latest — silent breakage when MediaPipe ships a
 * major.
 */
import { FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
/** The probe target. .js is intentional — it's a real file under the WASM dir. */
const WASM_PROBE_URL = `${WASM_URL}/vision_wasm_internal.js`;

let resolverPromise: Promise<any> | null = null;

/**
 * HEAD-probe the WASM CDN entry. Fails fast with a clear message if the
 * network/CDN path is broken, instead of hanging inside FilesetResolver.
 */
async function probeCdn(): Promise<void> {
  try {
    const res = await fetch(WASM_PROBE_URL, { method: 'HEAD' });
    if (!res.ok) {
      throw new Error(
        `MediaPipe CDN preflight returned ${res.status} for ${WASM_PROBE_URL}. ` +
          `Check that cdn.jsdelivr.net is reachable from this network.`,
      );
    }
  } catch (err: any) {
    // Re-throw with a recognizable prefix so callers can distinguish "CDN unreachable"
    // from "WASM/model failed to initialize".
    throw new Error(
      `MediaPipe CDN preflight failed (${err?.message || err}). ` +
        `Active internet access is required to load AR; the prototype loads ` +
        `WASM and pose model from cdn.jsdelivr.net and storage.googleapis.com.`,
    );
  }
}

async function loadVisionResolverOnce(): Promise<any> {
  await probeCdn();
  console.log('[MediaPipe] Downloading shared WASM runtime…');
  const resolver = await FilesetResolver.forVisionTasks(WASM_URL);
  console.log('[MediaPipe] Shared WASM runtime loaded OK');
  return resolver;
}

/**
 * Get the shared FilesetResolver for MediaPipe vision tasks.
 * Downloads WASM on first call, returns cached promise on subsequent calls.
 *
 * On first attempt failure, retries once after 1.5s. If both attempts fail,
 * the cached promise is cleared so a future call (e.g. user-driven retry) can
 * try again from scratch.
 */
export function getVisionResolver(): Promise<any> {
  if (!resolverPromise) {
    resolverPromise = loadVisionResolverOnce().catch(async (firstErr: any) => {
      console.warn(
        '[MediaPipe] First WASM init attempt failed; retrying once in 1.5s…',
        firstErr?.message || firstErr,
      );
      await new Promise((r) => setTimeout(r, 1500));
      try {
        return await loadVisionResolverOnce();
      } catch (secondErr: any) {
        // Both attempts failed — clear the cached failed promise so the next
        // call from a new mount/retry can start fresh.
        resolverPromise = null;
        throw secondErr;
      }
    });
  }
  return resolverPromise;
}

/** Reset the cached resolver (for testing or cleanup). */
export function resetVisionResolver(): void {
  resolverPromise = null;
}
