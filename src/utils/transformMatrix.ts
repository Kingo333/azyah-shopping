import type { ImageMetrics } from './measurePngTrim';
import { STAGE_W, STAGE_H, BASE_FRACTION } from './canvasLayout';

export interface LayerTransform {
  x: number;        // Center position X (scene space 0-1080)
  y: number;        // Center position Y (scene space 0-1920)
  scale: number;    // Scale multiplier (1.0 = 100%)
  rotation: number; // Degrees
  flipH: boolean;   // Horizontal flip
}

/**
 * Calculate display dimensions and padding offsets for a layer
 * This is the SINGLE SOURCE OF TRUTH for sizing
 */
export function calculateLayerDimensions(
  transform: LayerTransform,
  metrics: ImageMetrics
) {
  // Calculate target width (25% of stage * user scale)
  const targetW = STAGE_W * BASE_FRACTION * transform.scale;
  
  // Preserve aspect ratio
  const aspectRatio = metrics.naturalHeight / metrics.naturalWidth;
  const targetH = targetW * aspectRatio;
  
  // Compensate for transparent padding to keep visual center correct
  const offsetX = ((metrics.trim.left - metrics.trim.right) / metrics.naturalWidth) * targetW / 2;
  const offsetY = ((metrics.trim.top - metrics.trim.bottom) / metrics.naturalHeight) * targetH / 2;
  
  return {
    width: targetW,
    height: targetH,
    offsetX,
    offsetY,
  };
}

/**
 * Generate CSS transform string for preview
 * Uses SAME math as Canvas2D export
 */
export function toCSSTransform(
  transform: LayerTransform,
  metrics: ImageMetrics
): { left: string; top: string; width: string; height: string; transform: string } {
  const dims = calculateLayerDimensions(transform, metrics);
  
  // Convert to percentages for responsive preview
  const leftPercent = ((transform.x + dims.offsetX) / STAGE_W) * 100;
  const topPercent = ((transform.y + dims.offsetY) / STAGE_H) * 100;
  const widthPercent = (dims.width / STAGE_W) * 100;
  const heightPercent = (dims.height / STAGE_H) * 100;
  
  return {
    left: `${leftPercent}%`,
    top: `${topPercent}%`,
    width: `${widthPercent}%`,
    height: `${heightPercent}%`,
    transform: `
      translate(-50%, -50%)
      rotate(${transform.rotation}deg)
      scaleX(${transform.flipH ? -1 : 1})
    `.trim(),
  };
}

/**
 * Apply transform to Canvas2D context for export
 * Uses SAME math as CSS preview
 */
export function applyCanvasTransform(
  ctx: CanvasRenderingContext2D,
  transform: LayerTransform,
  metrics: ImageMetrics
) {
  const dims = calculateLayerDimensions(transform, metrics);
  
  // Translate to center position (with padding offset)
  ctx.translate(
    Math.round(transform.x + dims.offsetX),
    Math.round(transform.y + dims.offsetY)
  );
  
  // Rotate around center
  ctx.rotate((transform.rotation * Math.PI) / 180);
  
  // Apply horizontal flip
  ctx.scale(transform.flipH ? -1 : 1, 1);
  
  return {
    width: Math.round(dims.width),
    height: Math.round(dims.height),
  };
}
