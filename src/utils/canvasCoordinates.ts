/**
 * Canvas Coordinate Conversion Utilities
 * Convert between screen pixels and normalized 0-1 coordinates
 */

/**
 * Convert screen coordinates to normalized scene coordinates
 */
export function screenToNormalized(
  screenX: number,
  screenY: number,
  viewportRect: DOMRect,
  stageW: number = 1080,
  stageH: number = 1920
): { x: number; y: number } {
  
  // Get position relative to viewport
  const relX = screenX - viewportRect.left;
  const relY = screenY - viewportRect.top;
  
  // Normalize to 0-1 range
  const normX = relX / viewportRect.width;
  const normY = relY / viewportRect.height;
  
  return { x: normX, y: normY };
}

/**
 * Convert normalized coordinates back to screen coordinates
 */
export function normalizedToScreen(
  normX: number,
  normY: number,
  viewportRect: DOMRect
): { x: number; y: number } {
  
  const screenX = normX * viewportRect.width + viewportRect.left;
  const screenY = normY * viewportRect.height + viewportRect.top;
  
  return { x: screenX, y: screenY };
}

/**
 * Calculate normalized width and height from natural dimensions
 * Preserves aspect ratio
 */
export function calculateNormalizedSize(
  naturalW: number,
  naturalH: number,
  targetCoverage: number = 0.25, // Default: 25% of stage width
  stageW: number = 1080,
  stageH: number = 1920
): { w: number; h: number } {
  
  const aspectRatio = naturalH / naturalW;
  const stageAspectRatio = stageH / stageW;
  
  const w = targetCoverage;
  const h = targetCoverage * aspectRatio * stageAspectRatio;
  
  return { w, h };
}

/**
 * Convert delta in screen pixels to normalized delta
 */
export function screenDeltaToNormalized(
  deltaX: number,
  deltaY: number,
  viewportRect: DOMRect
): { dx: number; dy: number } {
  
  const dx = deltaX / viewportRect.width;
  const dy = deltaY / viewportRect.height;
  
  return { dx, dy };
}

/**
 * Clamp normalized coordinates to safe area
 */
export function clampToSafeArea(
  x: number,
  y: number,
  w: number,
  h: number,
  margin: number = 0
): { x: number; y: number } {
  
  const minX = margin + w / 2;
  const maxX = 1 - margin - w / 2;
  const minY = margin + h / 2;
  const maxY = 1 - margin - h / 2;
  
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number = 0.01): number {
  return Math.round(value / gridSize) * gridSize;
}
