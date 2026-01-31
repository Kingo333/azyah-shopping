/**
 * Object Detection Utilities for Auto-ROI
 * Uses simple heuristics to detect likely product regions in fashion photos.
 * 
 * Note: We use a lightweight approach for MVP - center-weighted detection
 * with future support for ML-based detection.
 */

import { CropRect } from './imageCropUtils';

export interface DetectedBox {
  x: number;      // 0-1 relative
  y: number;      // 0-1 relative
  width: number;  // 0-1 relative
  height: number; // 0-1 relative
  label: 'person' | 'garment' | 'accessory' | 'product' | 'detail';
  score: number;  // 0-1 confidence
}

/**
 * Analyze image and return candidate bounding boxes.
 * This MVP version uses heuristic-based detection:
 * - Assumes center-weighted composition (common in fashion photos)
 * - Creates garment/product regions based on typical fashion photo layouts
 */
export async function detectProductRegions(imageUrl: string): Promise<DetectedBox[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const boxes: DetectedBox[] = [];
      const aspectRatio = img.width / img.height;
      
      // Portrait/vertical images (typical model shots)
      if (aspectRatio < 0.9) {
        // Main garment region - upper body area (most common for fashion)
        boxes.push({
          x: 0.08,
          y: 0.12,
          width: 0.84,
          height: 0.55,
          label: 'garment',
          score: 0.9,
        });
        
        // Lower garment/bottom (for full-length shots)
        boxes.push({
          x: 0.12,
          y: 0.55,
          width: 0.76,
          height: 0.40,
          label: 'garment',
          score: 0.6,
        });
        
        // Detail/pattern region (center detail)
        boxes.push({
          x: 0.20,
          y: 0.25,
          width: 0.60,
          height: 0.35,
          label: 'detail',
          score: 0.5,
        });
      }
      // Landscape/horizontal (flat lays, product shots)
      else if (aspectRatio > 1.1) {
        // Center product region
        boxes.push({
          x: 0.15,
          y: 0.10,
          width: 0.70,
          height: 0.80,
          label: 'product',
          score: 0.9,
        });
        
        // Left item (for multi-product shots)
        boxes.push({
          x: 0.05,
          y: 0.10,
          width: 0.40,
          height: 0.80,
          label: 'accessory',
          score: 0.4,
        });
        
        // Right item
        boxes.push({
          x: 0.55,
          y: 0.10,
          width: 0.40,
          height: 0.80,
          label: 'accessory',
          score: 0.4,
        });
      }
      // Square-ish images
      else {
        // Main center product
        boxes.push({
          x: 0.10,
          y: 0.08,
          width: 0.80,
          height: 0.84,
          label: 'product',
          score: 0.9,
        });
        
        // Detail crop
        boxes.push({
          x: 0.25,
          y: 0.20,
          width: 0.50,
          height: 0.45,
          label: 'detail',
          score: 0.5,
        });
      }
      
      resolve(boxes);
    };
    
    img.onerror = () => {
      // Return default center crop on error
      resolve([{
        x: 0.10,
        y: 0.10,
        width: 0.80,
        height: 0.80,
        label: 'product',
        score: 0.5,
      }]);
    };
    
    img.src = imageUrl;
  });
}

/**
 * Find which candidate box contains the given point (tap location)
 */
export function findBoxAtPoint(
  boxes: DetectedBox[],
  pointX: number,  // 0-1 relative
  pointY: number   // 0-1 relative
): DetectedBox | null {
  // Find all boxes containing the point
  const containing = boxes.filter(box => 
    pointX >= box.x && 
    pointX <= box.x + box.width &&
    pointY >= box.y && 
    pointY <= box.y + box.height
  );
  
  if (containing.length === 0) return null;
  
  // Return smallest (most specific) box
  return containing.reduce((smallest, current) => {
    const smallestArea = smallest.width * smallest.height;
    const currentArea = current.width * current.height;
    return currentArea < smallestArea ? current : smallest;
  });
}

/**
 * Convert DetectedBox to CropRect
 */
export function boxToCropRect(box: DetectedBox): CropRect {
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };
}

/**
 * Create a small box around a tap point (fallback when no detection)
 */
export function createBoxAroundPoint(
  pointX: number,
  pointY: number,
  size: number = 0.4
): DetectedBox {
  const halfSize = size / 2;
  return {
    x: Math.max(0, Math.min(1 - size, pointX - halfSize)),
    y: Math.max(0, Math.min(1 - size, pointY - halfSize)),
    width: size,
    height: size,
    label: 'product',
    score: 0.5,
  };
}
