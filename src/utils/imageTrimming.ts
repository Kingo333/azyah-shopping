/**
 * Phase 3: Auto-Trim Transparent Padding
 * Scans and crops transparent margins from PNG images
 */

export interface TrimResult {
  trimmedDataUrl: string;
  offsetX: number; // Pixels trimmed from left
  offsetY: number; // Pixels trimmed from top
  originalWidth: number;
  originalHeight: number;
  trimmedWidth: number;
  trimmedHeight: number;
}

/**
 * Scans image pixels to find bounding box of non-transparent content
 */
function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 10
): { top: number; bottom: number; left: number; right: number } | null {
  let top = height;
  let bottom = 0;
  let left = width;
  let right = 0;
  let hasContent = false;

  // Scan all pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      // If alpha is above threshold, this pixel is part of content
      if (alpha > threshold) {
        hasContent = true;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  if (!hasContent) {
    console.warn('No non-transparent content found in image');
    return null;
  }

  return { top, bottom, left, right };
}

/**
 * Loads an image from File or URL
 */
function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    }
  });
}

/**
 * Trims transparent padding from an image
 * @param imageSource - File or URL string
 * @param threshold - Alpha threshold (0-255) to consider as transparent
 * @returns TrimResult with trimmed image and offset information
 */
export async function trimTransparentPadding(
  imageSource: File | string,
  threshold: number = 10
): Promise<TrimResult> {
  try {
    // Load image
    const img = await loadImage(imageSource);
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;

    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
    const bounds = findContentBounds(imageData.data, originalWidth, originalHeight, threshold);

    if (!bounds) {
      // No content found, return original
      console.warn('No content found, returning original image');
      return {
        trimmedDataUrl: canvas.toDataURL('image/png'),
        offsetX: 0,
        offsetY: 0,
        originalWidth,
        originalHeight,
        trimmedWidth: originalWidth,
        trimmedHeight: originalHeight,
      };
    }

    // Calculate trimmed dimensions
    const trimmedWidth = bounds.right - bounds.left + 1;
    const trimmedHeight = bounds.bottom - bounds.top + 1;

    // Create new canvas with trimmed size
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');

    if (!trimmedCtx) {
      throw new Error('Could not get trimmed canvas context');
    }

    // Draw cropped image
    trimmedCtx.drawImage(
      canvas,
      bounds.left,
      bounds.top,
      trimmedWidth,
      trimmedHeight,
      0,
      0,
      trimmedWidth,
      trimmedHeight
    );

    const trimmedDataUrl = trimmedCanvas.toDataURL('image/png');

    console.log(`Trimmed image from ${originalWidth}x${originalHeight} to ${trimmedWidth}x${trimmedHeight}`);
    console.log(`Offsets: left=${bounds.left}px, top=${bounds.top}px`);

    return {
      trimmedDataUrl,
      offsetX: bounds.left,
      offsetY: bounds.top,
      originalWidth,
      originalHeight,
      trimmedWidth,
      trimmedHeight,
    };
  } catch (error) {
    console.error('Error trimming image:', error);
    throw error;
  }
}

/**
 * Converts a data URL to a File object
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
