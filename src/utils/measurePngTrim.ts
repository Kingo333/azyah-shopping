import type { ImageMetrics } from './canvasLayout';

// Re-export ImageMetrics for convenience
export type { ImageMetrics } from './canvasLayout';

/**
 * Measure transparent padding in a PNG to compensate for visual center shifts
 */
export async function measurePngTrim(src: string): Promise<ImageMetrics> {
  const img = await loadImage(src);
  
  // Use OffscreenCanvas for better performance (fallback to regular canvas)
  const canvas = typeof OffscreenCanvas !== 'undefined' 
    ? new OffscreenCanvas(img.naturalWidth, img.naturalHeight)
    : document.createElement('canvas');
  
  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  }
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  
  const { width: natW, height: natH } = canvas;
  const imageData = ctx.getImageData(0, 0, natW, natH);
  const data = imageData.data;
  
  // Check if pixel has opacity
  const isOpaque = (x: number, y: number) => data[(y * natW + x) * 4 + 3] > 10; // threshold: 10/255
  
  // Scan from left
  let left = 0;
  while (left < natW && !Array.from({ length: natH }, (_, y) => isOpaque(left, y)).some(Boolean)) {
    left++;
  }
  
  // Scan from right
  let right = 0;
  while (right < natW && !Array.from({ length: natH }, (_, y) => isOpaque(natW - 1 - right, y)).some(Boolean)) {
    right++;
  }
  
  // Scan from top
  let top = 0;
  while (top < natH && !Array.from({ length: natW }, (_, x) => isOpaque(x, top)).some(Boolean)) {
    top++;
  }
  
  // Scan from bottom
  let bottom = 0;
  while (bottom < natH && !Array.from({ length: natW }, (_, x) => isOpaque(x, natH - 1 - bottom)).some(Boolean)) {
    bottom++;
  }
  
  return {
    naturalWidth: natW,
    naturalHeight: natH,
    trim: { left, right, top, bottom },
  };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
