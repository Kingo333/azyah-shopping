export interface CanvasLayer {
  id: string;
  imageUrl: string;
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

  // Load and render each layer
  await Promise.all(
    sortedLayers.map(async (layer) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = layer.imageUrl;
      });

      ctx.save();
      
      // Move to layer position
      ctx.translate(layer.position.x, layer.position.y);
      
      // Apply rotation
      ctx.rotate((layer.rotation * Math.PI) / 180);
      
      // Apply scale and flip
      const scaleX = layer.scale * (layer.flippedH ? -1 : 1);
      const scaleY = layer.scale;
      ctx.scale(scaleX, scaleY);
      
      // Apply opacity
      ctx.globalAlpha = layer.opacity;
      
      // Draw image centered at current position
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      ctx.restore();
    })
  );

  // Convert to base64
  return canvas.toDataURL('image/jpeg', 0.9);
}
