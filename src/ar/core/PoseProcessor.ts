/**
 * MediaPipe PoseLandmarker lifecycle management for the AR pipeline.
 *
 * Encapsulates the initialization of the WASM runtime and pose landmarker model,
 * and provides a clean interface for per-frame pose detection that hides
 * MediaPipe internals and prevents frame-level errors from crashing the render loop.
 *
 * The WASM and MODEL URLs were previously defined in ARExperience.tsx lines 12-13.
 *
 * Extracted from ARExperience.tsx lines 237-258.
 */
import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { getVisionResolver } from './MediaPipeRuntime';

/** CDN URL for the PoseLandmarker Lite model (float16). */
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * Result of a single pose detection frame.
 *
 * Contains both normalized landmarks (0-1 video coordinates) for screen-space
 * positioning and world landmarks (metric-scale meters) for body measurement.
 */
export interface PoseResult {
  /** Normalized landmarks in video coordinate space (0-1). Used for screen positioning. */
  landmarks: any[][];
  /** World landmarks in metric scale (meters). Used for body dimension measurement. */
  worldLandmarks: any[][];
}

/**
 * Clean interface for pose detection that wraps MediaPipe internals.
 *
 * The detectForVideo method catches errors internally so that a single
 * bad frame does not crash the entire render loop.
 */
export interface PoseProcessor {
  /**
   * Run pose detection on the current video frame.
   *
   * @param video - The HTMLVideoElement with an active camera stream.
   * @param timestamp - The current animation frame timestamp (from requestAnimationFrame).
   * @returns Detection result with landmarks and worldLandmarks, or null if detection failed.
   */
  detectForVideo(
    video: HTMLVideoElement,
    timestamp: number,
  ): PoseResult | null;

  /**
   * Close the underlying PoseLandmarker and release WASM resources.
   */
  close(): void;
}

/**
 * Initialize a PoseProcessor with the MediaPipe WASM runtime and model.
 *
 * Loads the WASM fileset from CDN, then creates a PoseLandmarker configured
 * for VIDEO mode with a single pose and moderate confidence thresholds.
 *
 * @returns A PoseProcessor ready for per-frame detection.
 * @throws Error if WASM or model loading fails (network error, incompatible browser, etc.).
 */
/** Race a promise against a timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. Check your connection.`)), ms)
    ),
  ]);
}

export async function createPoseProcessor(): Promise<PoseProcessor> {
  console.log('[PoseProcessor] Getting shared WASM runtime…');
  const vision = await withTimeout(
    getVisionResolver(),
    30_000,
    'WASM runtime download',
  );
  console.log('[PoseProcessor] WASM runtime loaded OK');

  console.log('[PoseProcessor] Downloading pose model…');
  const landmarker = await withTimeout(
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
    30_000,
    'Pose model download',
  );
  console.log('[PoseProcessor] Pose model loaded OK');

  return {
    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number,
    ): PoseResult | null {
      try {
        const result = landmarker.detectForVideo(video, timestamp);
        return {
          landmarks: result.landmarks,
          worldLandmarks: result.worldLandmarks,
        } as PoseResult;
      } catch (e) {
        console.warn('[PoseProcessor] Frame detection error:', e);
        return null;
      }
    },

    close(): void {
      landmarker.close();
    },
  };
}
