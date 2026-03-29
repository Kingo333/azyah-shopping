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
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/** CDN URL for MediaPipe WASM runtime. Pinned to @0.10.34 matching package.json. */
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';

/** CDN URL for the PoseLandmarker Lite model (float16). */
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

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
   * @returns Detection result with landmarks array, or null if detection failed.
   */
  detectForVideo(
    video: HTMLVideoElement,
    timestamp: number,
  ): { landmarks: any[][] } | null;

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
export async function createPoseProcessor(): Promise<PoseProcessor> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);

  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return {
    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number,
    ): { landmarks: any[][] } | null {
      try {
        const result = landmarker.detectForVideo(video, timestamp);
        return result as { landmarks: any[][] };
      } catch {
        // Swallow frame-level errors to prevent render loop crash
        return null;
      }
    },

    close(): void {
      landmarker.close();
    },
  };
}
