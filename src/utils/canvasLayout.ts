export const STAGE_W = 1080;
export const STAGE_H = 1920;
export const BASE_FRACTION = 0.25; // 25% of stage width

export interface ImageMetrics {
  naturalWidth: number;
  naturalHeight: number;
  trim: { left: number; right: number; top: number; bottom: number };
}

/**
 * Calculate exact target rectangle for an item
 * Returns pixel dimensions and offsets to compensate for transparent padding
 */
export function getTargetRect(
  transform: { x: number; y: number; scale: number; rotation: number },
  metrics: ImageMetrics
) {
  // Calculate target width (same as current: 25% * scale)
  const targetW = STAGE_W * BASE_FRACTION * transform.scale;
  
  // Calculate height preserving aspect ratio
  const aspectRatio = metrics.naturalHeight / metrics.naturalWidth;
  const targetH = targetW * aspectRatio;
  
  // Compensate for transparent trim to keep visual center correct
  const trimOffsetX = ((metrics.trim.left - metrics.trim.right) / metrics.naturalWidth) * targetW / 2;
  const trimOffsetY = ((metrics.trim.top - metrics.trim.bottom) / metrics.naturalHeight) * targetH / 2;
  
  return {
    targetW,
    targetH,
    offsetX: trimOffsetX,
    offsetY: trimOffsetY,
  };
}
