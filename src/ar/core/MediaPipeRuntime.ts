/**
 * Shared MediaPipe WASM runtime — downloaded once, reused by all tasks.
 *
 * Both PoseProcessor and BodySegmenter need the same WASM fileset from CDN.
 * This module ensures it's only downloaded once (saves ~3MB on first load).
 */
import { FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';

let resolverPromise: Promise<any> | null = null;

/**
 * Get the shared FilesetResolver for MediaPipe vision tasks.
 * Downloads WASM on first call, returns cached promise on subsequent calls.
 */
export function getVisionResolver(): Promise<any> {
  if (!resolverPromise) {
    console.log('[MediaPipe] Downloading shared WASM runtime…');
    resolverPromise = FilesetResolver.forVisionTasks(WASM_URL).then((resolver) => {
      console.log('[MediaPipe] Shared WASM runtime loaded OK');
      return resolver;
    });
  }
  return resolverPromise;
}

/** Reset the cached resolver (for testing or cleanup). */
export function resetVisionResolver(): void {
  resolverPromise = null;
}
