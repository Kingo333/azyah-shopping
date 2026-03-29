/**
 * Canonical coordinate transform utilities for the AR pipeline.
 *
 * These functions centralize the math for converting MediaPipe normalized
 * landmark coordinates into Three.js world coordinates, accounting for:
 * - Selfie camera mirroring (applied exactly once)
 * - Object-fit:cover crop geometry (video vs. display aspect ratio mismatch)
 * - NDC-to-world coordinate mapping (normalized [0,1] to centered world units)
 *
 * All landmark-to-world conversions in the application MUST go through
 * landmarkToWorld() to avoid scattered ad-hoc coordinate math.
 */

/**
 * Describes the visible portion of a video when displayed with object-fit:cover.
 *
 * When the video aspect ratio differs from the display aspect ratio,
 * object-fit:cover scales the video to fill the display and crops the excess.
 * This interface captures how much of the original video is visible.
 */
export interface CoverCropInfo {
  /** Fraction of the video's X range that is visible (0-1). 1 = no horizontal crop. */
  scaleX: number;
  /** Fraction of the video's Y range that is visible (0-1). 1 = no vertical crop. */
  scaleY: number;
  /** Normalized offset cropped from each side in X (0-0.5). */
  offsetX: number;
  /** Normalized offset cropped from each side in Y (0-0.5). */
  offsetY: number;
}

/**
 * Compute the object-fit:cover crop geometry for a video displayed in a container.
 *
 * When a video is displayed with CSS `object-fit: cover`, it is scaled to fill
 * the container while maintaining aspect ratio, then the excess is cropped
 * symmetrically (assuming default `object-position: 50% 50%`).
 *
 * @param videoWidth - Native width of the video feed in pixels.
 * @param videoHeight - Native height of the video feed in pixels.
 * @param displayWidth - Width of the display container in pixels.
 * @param displayHeight - Height of the display container in pixels.
 * @returns CoverCropInfo describing the visible sub-rectangle of the video.
 *
 * @example
 * // 1280x720 video on a 390x844 phone display:
 * // Video aspect (1.78) > display aspect (0.46) -> video is wider, crop sides
 * const crop = computeCoverCrop(1280, 720, 390, 844);
 * // crop.scaleX ~= 0.26, crop.offsetX ~= 0.37 (significant horizontal crop)
 */
export function computeCoverCrop(
  videoWidth: number,
  videoHeight: number,
  displayWidth: number,
  displayHeight: number,
): CoverCropInfo {
  // Guard against invalid dimensions
  if (videoWidth <= 0 || videoHeight <= 0 || displayWidth <= 0 || displayHeight <= 0) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }

  const videoAspect = videoWidth / videoHeight;
  const displayAspect = displayWidth / displayHeight;

  if (videoAspect > displayAspect) {
    // Video is wider than display: crop sides
    const scaleX = displayAspect / videoAspect;
    return {
      scaleX,
      scaleY: 1,
      offsetX: (1 - scaleX) / 2,
      offsetY: 0,
    };
  } else {
    // Video is taller (or equal) than display: crop top/bottom
    const scaleY = videoAspect / displayAspect;
    return {
      scaleX: 1,
      scaleY,
      offsetX: 0,
      offsetY: (1 - scaleY) / 2,
    };
  }
}

/**
 * Convert a MediaPipe normalized landmark to Three.js world coordinates.
 *
 * Performs a three-step transform:
 * 1. **Mirror X** for selfie camera (applied exactly once here, nowhere else)
 * 2. **Apply cover-crop** to map from full-video-normalized to visible-portion-normalized
 * 3. **NDC-to-world** conversion from [0,1] to centered Three.js world units
 *
 * The Y axis is flipped: screen Y is top-down, Three.js Y is bottom-up.
 *
 * @param landmark - A MediaPipe normalized landmark with x, y in [0, 1].
 * @param coverCrop - The cover crop info from computeCoverCrop().
 * @param visibleDims - The visible world dimensions at the camera's Z distance
 *   (computed from camera FOV and position.z).
 * @param mirror - Whether to mirror the X axis for selfie camera. Default true.
 * @returns World-space coordinates { x, y } in Three.js units, centered at (0, 0).
 */
export function landmarkToWorld(
  landmark: { x: number; y: number },
  coverCrop: CoverCropInfo,
  visibleDims: { w: number; h: number },
  mirror: boolean = true,
): { x: number; y: number } {
  // Step 1: Mirror X for selfie camera (handle ONCE here, nowhere else in the codebase)
  let nx = mirror ? 1 - landmark.x : landmark.x;
  let ny = landmark.y;

  // Step 2: Apply cover-crop -- map from full-video-normalized to visible-portion-normalized
  nx = (nx - coverCrop.offsetX) / coverCrop.scaleX;
  ny = (ny - coverCrop.offsetY) / coverCrop.scaleY;

  // Step 3: Convert [0,1] to Three.js world units (centered at 0)
  // Flip Y: screen Y is top-down, Three.js Y is bottom-up
  const worldX = (nx - 0.5) * visibleDims.w;
  const worldY = -(ny - 0.5) * visibleDims.h;

  return { x: worldX, y: worldY };
}
