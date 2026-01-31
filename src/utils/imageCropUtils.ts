// Canvas-based image cropping utilities for deals photo search

export interface CropRect {
  x: number;      // 0-1 relative position
  y: number;      // 0-1 relative position
  width: number;  // 0-1 relative size
  height: number; // 0-1 relative size
}

export interface CropPreset {
  id: 'garment' | 'pattern' | 'full';
  label: string;
  description: string;
  rect: CropRect;
}

// Default crop presets
export const CROP_PRESETS: CropPreset[] = [
  {
    id: 'garment',
    label: 'Garment',
    description: 'Focus on the main clothing item',
    rect: { x: 0.1, y: 0.15, width: 0.8, height: 0.7 },
  },
  {
    id: 'pattern',
    label: 'Pattern',
    description: 'Focus on pattern/print details',
    rect: { x: 0.25, y: 0.3, width: 0.5, height: 0.4 },
  },
  {
    id: 'full',
    label: 'Full Image',
    description: 'Use the entire image',
    rect: { x: 0, y: 0, width: 1, height: 1 },
  },
];

// Default crop suggestion: center 70% of image
export const DEFAULT_CROP: CropRect = { x: 0.15, y: 0.15, width: 0.7, height: 0.7 };

/**
 * Load an image from a URL or blob
 */
export function loadImage(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (source instanceof Blob) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Apply a crop rect to an image and return a new blob
 */
export async function cropImage(
  source: string | Blob,
  crop: CropRect,
  maxDimension: number = 1920 // Limit output size for API efficiency
): Promise<Blob> {
  const img = await loadImage(source);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  
  // Calculate pixel values from relative crop
  const cropX = Math.floor(img.width * crop.x);
  const cropY = Math.floor(img.height * crop.y);
  const cropWidth = Math.floor(img.width * crop.width);
  const cropHeight = Math.floor(img.height * crop.height);
  
  // Calculate output dimensions with max limit
  let outputWidth = cropWidth;
  let outputHeight = cropHeight;
  
  if (outputWidth > maxDimension || outputHeight > maxDimension) {
    const scale = Math.min(maxDimension / outputWidth, maxDimension / outputHeight);
    outputWidth = Math.floor(outputWidth * scale);
    outputHeight = Math.floor(outputHeight * scale);
  }
  
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  // Draw the cropped region
  ctx.drawImage(
    img,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, outputWidth, outputHeight
  );
  
  // Convert to blob (JPEG for photos, high quality)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      0.92 // High quality
    );
  });
}

/**
 * Generate multiple crop blobs from a single image
 */
export async function generateMultipleCrops(
  source: string | Blob,
  crops: { type: 'garment' | 'pattern' | 'full'; rect: CropRect }[]
): Promise<{ type: string; blob: Blob }[]> {
  const results: { type: string; blob: Blob }[] = [];
  
  for (const crop of crops) {
    try {
      const blob = await cropImage(source, crop.rect);
      results.push({ type: crop.type, blob });
    } catch (err) {
      console.error(`Failed to generate ${crop.type} crop:`, err);
    }
  }
  
  return results;
}

/**
 * Convert absolute pixel coordinates to relative crop rect
 */
export function pixelsToCropRect(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
): CropRect {
  return {
    x: x / imageWidth,
    y: y / imageHeight,
    width: width / imageWidth,
    height: height / imageHeight,
  };
}

/**
 * Convert relative crop rect to pixel coordinates
 */
export function cropRectToPixels(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.floor(crop.x * imageWidth),
    y: Math.floor(crop.y * imageHeight),
    width: Math.floor(crop.width * imageWidth),
    height: Math.floor(crop.height * imageHeight),
  };
}

/**
 * Clamp a crop rect to stay within image bounds
 */
export function clampCropRect(crop: CropRect): CropRect {
  const x = Math.max(0, Math.min(1 - 0.1, crop.x));
  const y = Math.max(0, Math.min(1 - 0.1, crop.y));
  const width = Math.min(1 - x, Math.max(0.1, crop.width));
  const height = Math.min(1 - y, Math.max(0.1, crop.height));
  
  return { x, y, width, height };
}

/**
 * Calculate aspect ratio of a crop
 */
export function getCropAspectRatio(crop: CropRect): number {
  return crop.width / crop.height;
}
