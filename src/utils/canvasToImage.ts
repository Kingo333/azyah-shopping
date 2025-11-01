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
  width: number = 600,
  height: number = 600
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
        
        // Move to layer position (round to avoid sub-pixel issues)
        ctx.translate(Math.round(layer.position.x), Math.round(layer.position.y));
        
        // Apply rotation
        ctx.rotate((layer.rotation * Math.PI) / 180);
        
        // Calculate target width (25% of canvas width * user's scale)
        const targetWidth = width * 0.25 * layer.scale;
        
        // Preserve aspect ratio using natural dimensions
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const targetHeight = targetWidth * aspectRatio;
        
        // Apply flip (scale is 1 or -1 for flip, size is in context already)
        ctx.scale(layer.flippedH ? -1 : 1, 1);
        
        // Apply opacity
        ctx.globalAlpha = layer.opacity;
        
        // Draw at fixed size, centered (round to avoid sub-pixel blur)
        ctx.drawImage(
          img,
          Math.round(-targetWidth / 2),
          Math.round(-targetHeight / 2),
          Math.round(targetWidth),
          Math.round(targetHeight)
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
