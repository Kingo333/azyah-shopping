/**
 * MediaPipe SelfieSegmentation wrapper for body occlusion in AR.
 *
 * Produces a per-pixel body mask that SceneManager uses to create an invisible
 * depth wall — garment pixels are hidden behind body pixels, so arms appear
 * in front of the garment instead of behind it.
 *
 * Performance features:
 * - Throttled to 10fps (100ms) to limit GPU load
 * - Mask interpolation: blends previous mask with current (0.7 factor) for smooth transitions
 * - Enable/disable toggle for quality tiers (auto-disable when fps drops)
 * - Graceful failure: if segmentation model can't load, AR works without occlusion
 */
import { ImageSegmenter } from '@mediapipe/tasks-vision';
import { getVisionResolver } from './MediaPipeRuntime';
const SEGMENTER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

/** Minimum interval between segmentation calls (100ms = 10fps). */
const THROTTLE_MS = 100;

/** Blend factor for temporal mask smoothing (0 = keep old, 1 = use new). */
const BLEND_FACTOR = 0.7;

export class BodySegmenter {
  private segmenter: ImageSegmenter;
  private lastSegmentTime = 0;
  private enabled = true;
  private previousMask: Float32Array | null = null;

  private constructor(segmenter: ImageSegmenter) {
    this.segmenter = segmenter;
  }

  /**
   * Create a BodySegmenter. Returns null on failure (graceful degradation).
   */
  static async create(): Promise<BodySegmenter | null> {
    try {
      console.log('[BodySegmenter] Getting shared WASM runtime…');
      const vision = await getVisionResolver();
      const segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
      console.log('[BodySegmenter] Segmentation model loaded OK');
      return new BodySegmenter(segmenter);
    } catch (err: any) {
      console.warn('[BodySegmenter] Segmentation unavailable:', err.message || err);
      return null;
    }
  }

  /**
   * Run segmentation on the current video frame.
   *
   * Returns a Float32Array of confidence values (0-1) for each pixel,
   * temporally smoothed with the previous mask. Returns null if throttled
   * or disabled.
   *
   * @param video - The video element with live camera feed.
   * @param timestamp - Current animation frame timestamp.
   * @returns Smoothed mask data { data, width, height } or null.
   */
  segment(
    video: HTMLVideoElement,
    timestamp: number,
  ): { data: Float32Array; width: number; height: number } | null {
    if (!this.enabled) return null;

    // Throttle to 10fps
    if (timestamp - this.lastSegmentTime < THROTTLE_MS) return null;
    this.lastSegmentTime = timestamp;

    try {
      const result = this.segmenter.segmentForVideo(video, timestamp);
      const masks = result.confidenceMasks;
      if (!masks || masks.length === 0) return null;

      const mask = masks[0];
      const width = mask.width;
      const height = mask.height;

      // Get raw confidence values as Float32Array
      const rawData = mask.getAsFloat32Array();
      if (!rawData || rawData.length === 0) return null;

      // Temporal smoothing: blend with previous mask
      let smoothed: Float32Array;
      if (this.previousMask && this.previousMask.length === rawData.length) {
        smoothed = new Float32Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) {
          smoothed[i] = this.previousMask[i] * (1 - BLEND_FACTOR) + rawData[i] * BLEND_FACTOR;
        }
      } else {
        smoothed = new Float32Array(rawData);
      }

      this.previousMask = smoothed;

      // Clean up MediaPipe result
      mask.close();

      return { data: smoothed, width, height };
    } catch {
      return null;
    }
  }

  /** Enable or disable segmentation (for quality tier switching). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.previousMask = null;
    }
  }

  /** Whether segmentation is currently enabled. */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Release all resources. */
  close(): void {
    this.segmenter.close();
    this.previousMask = null;
  }
}
