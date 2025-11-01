import { layerMatrix, applyMatrixToCanvas, resetCanvasTransform } from './canvasTransforms';
import { getTargetRect, STAGE_W, STAGE_H } from './canvasLayout';

export interface RenderableLayer {
  id: string;
  preloadedImage: HTMLImageElement;
  transform: { x: number; y: number; scale: number; rotation: number };
  flipH: boolean;
  opacity: number;
  visible: boolean;
  zIndex: number;
}

export interface CanvasBackground {
  type: 'solid' | 'gradient' | 'pattern' | 'image';
  value: string;
}

/**
 * Unified canvas renderer - single source of truth for both preview and export
 * Uses the same matrix math to guarantee WYSIWYG rendering
 */
export function renderLayers(
  ctx: CanvasRenderingContext2D,
  layers: RenderableLayer[],
  background: CanvasBackground
): void {
  const { width, height } = ctx.canvas;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Render background
  if (background.type === 'solid') {
    ctx.fillStyle = background.value;
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'gradient') {
    // Parse gradient value if needed
    if (background.value.includes('linear-gradient')) {
      // Extract colors from CSS gradient syntax
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#f0f0f0');
      ctx.fillStyle = gradient;
    } else if (background.value.includes(',')) {
      // Simple two-color format
      const [color1, color2] = background.value.split(',').map(c => c.trim());
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Fallback to solid
      ctx.fillStyle = background.value;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (background.type === 'image') {
    // Background images should be handled separately by loading the image
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Default white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  
  // Sort and render layers
  const visibleLayers = layers
    .filter(l => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);
  
  for (const layer of visibleLayers) {
    const img = layer.preloadedImage;
    
    // Skip if image not loaded
    if (!img.complete || img.naturalWidth === 0) {
      console.warn(`Layer ${layer.id}: Image not loaded, skipping`);
      continue;
    }
    
    // Calculate target dimensions using shared math
    const { targetW, targetH } = getTargetRect(
      layer.transform,
      img.naturalWidth,
      img.naturalHeight
    );
    
    // Scale coordinates if canvas is not at standard resolution
    const scaleX = width / STAGE_W;
    const scaleY = height / STAGE_H;
    
    ctx.save();
    
    // Set opacity
    ctx.globalAlpha = layer.opacity;
    
    // High-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Create and apply unified transform matrix
    const matrix = layerMatrix({
      x: layer.transform.x * scaleX,
      y: layer.transform.y * scaleY,
      scale: layer.transform.scale,
      rotation: layer.transform.rotation,
      flipH: layer.flipH,
    });
    
    applyMatrixToCanvas(ctx, matrix);
    
    // Draw image centered at origin (matrix already includes translation)
    ctx.drawImage(
      img,
      Math.round(-targetW * scaleX / 2),
      Math.round(-targetH * scaleY / 2),
      Math.round(targetW * scaleX),
      Math.round(targetH * scaleY)
    );
    
    ctx.restore();
  }
}
