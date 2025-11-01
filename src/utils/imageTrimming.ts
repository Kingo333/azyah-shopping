export interface TrimResult {
  dataUrl: string;
  offset: { x: number; y: number };
  trimmedSize: { w: number; h: number };
  originalSize: { w: number; h: number };
}

/**
 * Find the content bounds of an image (pixels with alpha > threshold)
 */
function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null; // Image is fully transparent
  return { minX, minY, maxX, maxY };
}

/**
 * Load an image from a File or URL
 */
async function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Trim transparent borders from PNG and return trimmed image as data URL + metadata
 */
export async function trimTransparentPadding(
  imageSource: File | string,
  alphaThreshold = 5
): Promise<TrimResult> {
  const img = await loadImage(imageSource);
  
  // Draw original image to canvas
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) throw new Error('Canvas context not available');
  
  sourceCtx.drawImage(img, 0, 0);
  
  // Get image data and find content bounds
  const imageData = sourceCtx.getImageData(0, 0, img.width, img.height);
  const bounds = findContentBounds(imageData.data, img.width, img.height, alphaThreshold);
  
  if (!bounds) {
    throw new Error('Image is fully transparent');
  }
  
  const { minX, minY, maxX, maxY } = bounds;
  
  // Add 1px padding to avoid edge artifacts
  const paddedMinX = Math.max(0, minX - 1);
  const paddedMinY = Math.max(0, minY - 1);
  const paddedMaxX = Math.min(img.width - 1, maxX + 1);
  const paddedMaxY = Math.min(img.height - 1, maxY + 1);
  
  const trimmedW = paddedMaxX - paddedMinX + 1;
  const trimmedH = paddedMaxY - paddedMinY + 1;
  
  // Create trimmed canvas
  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedW;
  trimmedCanvas.height = trimmedH;
  
  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) throw new Error('Canvas context not available');
  
  // Draw trimmed region
  trimmedCtx.drawImage(
    sourceCanvas,
    paddedMinX, paddedMinY, trimmedW, trimmedH,
    0, 0, trimmedW, trimmedH
  );
  
  // Convert to data URL
  const dataUrl = trimmedCanvas.toDataURL('image/png', 1.0);
  
  return {
    dataUrl,
    offset: { x: paddedMinX, y: paddedMinY },
    trimmedSize: { w: trimmedW, h: trimmedH },
    originalSize: { w: img.width, h: img.height },
  };
}

/**
 * Convert data URL to File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}
