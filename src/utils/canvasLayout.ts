export const STAGE_W = 1080;
export const STAGE_H = 1920;
export const BASE_FRACTION = 0.25; // 25% of stage width

/**
 * Calculate exact target rectangle for an item
 * Simplified - no offset compensation needed since images are trimmed at upload
 */
export function getTargetRect(
  transform: { x: number; y: number; scale: number; rotation: number },
  imageWidth: number,
  imageHeight: number
) {
  // Calculate target width (25% * scale)
  const targetW = STAGE_W * BASE_FRACTION * transform.scale;
  
  // Calculate height preserving aspect ratio
  const aspectRatio = imageHeight / imageWidth;
  const targetH = targetW * aspectRatio;
  
  // No offsets needed - trimmed images have visual bounds = math bounds
  return { targetW, targetH };
}
