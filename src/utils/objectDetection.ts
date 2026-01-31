/**
 * Object Detection Utilities for Auto-ROI
 * Uses Gemini-based backend detection for real object bounding boxes.
 */

import { CropRect } from './imageCropUtils';
import { supabase } from '@/integrations/supabase/client';

export interface DetectedBox {
  x: number;      // 0-1 relative
  y: number;      // 0-1 relative
  width: number;  // 0-1 relative
  height: number; // 0-1 relative
  label: 'person' | 'garment' | 'accessory' | 'product' | 'detail' | 'footwear' | 'bag' | 'jewelry';
  score: number;  // 0-1 confidence
  description?: string;
}

/**
 * Detect objects in an image using Gemini vision (backend).
 * Returns actual bounding boxes around detected items.
 */
export async function detectProductRegions(imageUrl: string): Promise<DetectedBox[]> {
  try {
    console.log('[detectProductRegions] Calling backend detection...');
    
    const { data, error } = await supabase.functions.invoke('detect-objects', {
      body: { imageUrl },
    });

    if (error) {
      console.error('[detectProductRegions] Backend error:', error);
      return getFallbackBoxes(imageUrl);
    }

    if (!data?.success || !data?.objects?.length) {
      console.warn('[detectProductRegions] No objects detected, using fallback');
      return getFallbackBoxes(imageUrl);
    }

    // Convert backend response to DetectedBox format
    const boxes: DetectedBox[] = data.objects.map((obj: any, idx: number) => ({
      x: obj.box.x,
      y: obj.box.y,
      width: obj.box.width,
      height: obj.box.height,
      label: obj.label || 'product',
      score: obj.confidence || 0.5,
      description: obj.description,
    }));

    // Sort by confidence (highest first)
    boxes.sort((a, b) => b.score - a.score);

    console.log(`[detectProductRegions] Detected ${boxes.length} objects:`, 
      boxes.map(b => `${b.label}(${(b.score * 100).toFixed(0)}%)`).join(', '));

    return boxes;

  } catch (err) {
    console.error('[detectProductRegions] Error:', err);
    return getFallbackBoxes(imageUrl);
  }
}

/**
 * Fallback heuristic detection when backend is unavailable.
 * Uses aspect ratio to guess likely product regions.
 */
async function getFallbackBoxes(imageUrl: string): Promise<DetectedBox[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const boxes: DetectedBox[] = [];
      const aspectRatio = img.width / img.height;
      
      // Portrait/vertical images (typical model shots)
      if (aspectRatio < 0.9) {
        // Main garment region - upper body area
        boxes.push({
          x: 0.08,
          y: 0.12,
          width: 0.84,
          height: 0.55,
          label: 'garment',
          score: 0.7,
        });
        
        // Lower garment/bottom
        boxes.push({
          x: 0.12,
          y: 0.55,
          width: 0.76,
          height: 0.40,
          label: 'garment',
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
          score: 0.7,
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
          score: 0.7,
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
