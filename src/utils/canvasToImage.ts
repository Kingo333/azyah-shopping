import { STAGE_W, STAGE_H, getTargetRect } from './canvasLayout';

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

  // Render background
  if (background.type === 'solid') {
    ctx.fillStyle = background.value;
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'gradient') {
    // Parse gradient value (e.g., "linear-gradient(180deg, #fff, #000)")
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#f0f0f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Default white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // Sort layers by zIndex
  const sortedLayers = [...layers]
    .filter(l => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  // Render each layer using pre-loaded images
  for (const layer of sortedLayers) {
    try {
      let img: HTMLImageElement;

      // Use pre-loaded image if available, otherwise load on demand (legacy)
      if (layer.preloadedImage) {
        img = layer.preloadedImage;
        console.log(`Layer ${layer.id}: Using pre-loaded image (${img.width}x${img.height})`);
      } else if (layer.imageUrl) {
        // Legacy fallback - load image on demand
        img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            console.log(`Layer ${layer.id}: Image loaded on-demand (${img.width}x${img.height})`);
            resolve();
          };
          img.onerror = (e) => {
            console.warn(`Layer ${layer.id}: Failed to load image - ${layer.imageUrl}`, e);
            resolve(); // Continue instead of rejecting
          };
          img.src = layer.imageUrl!;
        });
      } else {
        console.warn(`Layer ${layer.id}: No image source available`);
        continue;
      }

      // Only draw if image loaded successfully
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        
        // Use shared math for exact dimensions (no metrics needed - images are trimmed)
        const { targetW, targetH } = getTargetRect(
          {
            x: layer.position.x,
            y: layer.position.y,
            scale: layer.scale,
            rotation: layer.rotation,
          },
          img.naturalWidth,
          img.naturalHeight
        );
        
        // Apply transforms in SAME ORDER as editor
        ctx.translate(
          Math.round(layer.position.x),
          Math.round(layer.position.y)
        );
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.scale(layer.flippedH ? -1 : 1, 1);
        
        // High-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalAlpha = layer.opacity;
        
        // Draw centered on transform origin
        ctx.drawImage(
          img,
          Math.round(-targetW / 2),
          Math.round(-targetH / 2),
          Math.round(targetW),
          Math.round(targetH)
        );
        
        ctx.restore();
      }
    } catch (error) {
      console.error(`Error rendering layer ${layer.id}:`, error);
      // Continue to next layer
    }
  }

  // Convert to base64
  return canvas.toDataURL('image/jpeg', 0.9);
}
