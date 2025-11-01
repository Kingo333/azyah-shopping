import { STAGE_W, STAGE_H } from './canvasLayout';
import { renderLayers, RenderableLayer, CanvasBackground as UnifiedBackground } from './canvasRenderer';

export interface CanvasLayer {
  id: string;
  imageUrl?: string; // Legacy support
  preloadedImage?: HTMLImageElement; // New: pre-loaded image
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  flippedH: boolean;
  opacity: number;
  visible: boolean;
  zIndex: number;
}

export interface CanvasBackground {
  type: 'solid' | 'gradient' | 'pattern' | 'image';
  value: string;
}

/**
 * Renders canvas layers and background to a PNG base64 string
 * Now uses the unified renderer for guaranteed WYSIWYG
 */
export async function renderCanvasToBase64(
  layers: CanvasLayer[],
  background: CanvasBackground,
  width: number = STAGE_W,
  height: number = STAGE_H
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Convert CanvasLayer format to RenderableLayer format for unified renderer
  const renderableLayers: RenderableLayer[] = [];
  
  for (const layer of layers) {
    let img: HTMLImageElement | undefined;

    // Use pre-loaded image if available, otherwise load on demand (legacy)
    if (layer.preloadedImage) {
      img = layer.preloadedImage;
      console.log(`Layer ${layer.id}: Using pre-loaded image (${img.width}x${img.height})`);
    } else if (layer.imageUrl) {
      // Legacy fallback - load image on demand
      img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img!.onload = () => {
          console.log(`Layer ${layer.id}: Image loaded on-demand (${img!.width}x${img!.height})`);
          resolve();
        };
        img!.onerror = (e) => {
          console.warn(`Layer ${layer.id}: Failed to load image - ${layer.imageUrl}`, e);
          resolve(); // Continue instead of rejecting
        };
        img!.src = layer.imageUrl!;
      });
    } else {
      console.warn(`Layer ${layer.id}: No image source available`);
      continue;
    }

    // Only add if image loaded successfully
    if (img && img.complete && img.naturalWidth > 0) {
      renderableLayers.push({
        id: layer.id,
        preloadedImage: img,
        transform: {
          x: layer.position.x,
          y: layer.position.y,
          scale: layer.scale,
          rotation: layer.rotation,
        },
        flipH: layer.flippedH,
        opacity: layer.opacity,
        visible: layer.visible,
        zIndex: layer.zIndex,
      });
    }
  }

  // Use unified renderer - single source of truth
  renderLayers(ctx, renderableLayers, background);

  // Convert to base64
  return canvas.toDataURL('image/jpeg', 0.9);
}
