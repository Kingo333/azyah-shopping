/**
 * Universal Canvas Renderer
 * Single rendering function for both editor preview and export
 * Ensures pixel-perfect "save-what-you-see" behavior
 */

import type { CanvasScene, NormalizedCanvasItem, CanvasBackground } from '@/types/canvas';

/**
 * Load image with Promise wrapper
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Universal canvas renderer - works for both editor preview and export
 * 
 * @param scene - Normalized scene data
 * @param ctx - Canvas 2D context
 * @param viewportWidth - Physical width to render (e.g., 2160 for 2x DPR)
 * @param viewportHeight - Physical height to render (e.g., 3840 for 2x DPR)
 * @param DPR - Device pixel ratio (default: 1)
 */
export async function renderScene(
  scene: CanvasScene,
  ctx: CanvasRenderingContext2D,
  viewportWidth: number = 1080,
  viewportHeight: number = 1920,
  DPR: number = 1
): Promise<void> {
  
  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Clear and render background
  renderBackground(ctx, scene.background, viewportWidth, viewportHeight);
  
  // Sort by z-index
  const sortedItems = [...scene.items]
    .filter(item => item.visible)
    .sort((a, b) => a.z - b.z);
  
  // Render each item
  for (const item of sortedItems) {
    await renderItem(ctx, item, scene.stageWidth, scene.stageHeight, viewportWidth, viewportHeight, DPR);
  }
}

async function renderItem(
  ctx: CanvasRenderingContext2D,
  item: NormalizedCanvasItem,
  stageW: number,
  stageH: number,
  viewportW: number,
  viewportH: number,
  DPR: number
): Promise<void> {
  
  ctx.save();
  
  // Convert normalized coordinates to viewport pixels
  const centerX = item.x * viewportW;
  const centerY = item.y * viewportH;
  const itemWidth = item.w * viewportW;
  const itemHeight = item.h * viewportH;
  
  // Snap to half-pixels to avoid blur
  const snapX = Math.round(centerX * DPR) / DPR;
  const snapY = Math.round(centerY * DPR) / DPR;
  
  // Move to item center
  ctx.translate(snapX, snapY);
  
  // Apply rotation
  ctx.rotate((item.rotation * Math.PI) / 180);
  
  // Apply scale/flip
  ctx.scale(item.scaleX, item.scaleY);
  
  // Apply opacity
  ctx.globalAlpha = item.opacity;
  
  // Load image
  const img = await loadImage(item.src);
  
  // Draw centered on the transform origin
  ctx.drawImage(
    img,
    Math.round(-itemWidth / 2),
    Math.round(-itemHeight / 2),
    Math.round(itemWidth),
    Math.round(itemHeight)
  );
  
  ctx.restore();
}

function renderBackground(
  ctx: CanvasRenderingContext2D,
  bg: CanvasBackground,
  width: number,
  height: number
): void {
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.value;
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === 'gradient') {
    // Parse gradient value (e.g., "linear-gradient(180deg, #fff, #f7f7f7)")
    // For now, use a default gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#f7f7f7');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === 'image') {
    // Future: load and draw background image
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Default background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Render to base64 for export
 */
export async function renderSceneToBase64(
  scene: CanvasScene,
  exportWidth: number = 1080,
  exportHeight: number = 1920,
  quality: number = 0.92,
  DPR: number = 2
): Promise<string> {
  
  // Create offscreen canvas at high resolution
  const renderWidth = exportWidth * DPR;
  const renderHeight = exportHeight * DPR;
  
  const canvas = document.createElement('canvas');
  canvas.width = renderWidth;
  canvas.height = renderHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Render at high resolution
  await renderScene(scene, ctx, renderWidth, renderHeight, DPR);
  
  // Downscale to final size for better quality
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = exportWidth;
  finalCanvas.height = exportHeight;
  const finalCtx = finalCanvas.getContext('2d');
  
  if (!finalCtx) {
    throw new Error('Failed to get final canvas context');
  }
  
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(canvas, 0, 0, exportWidth, exportHeight);
  
  // Export as JPEG
  return finalCanvas.toDataURL('image/jpeg', quality);
}
