/**
 * Normalized Canvas Data Model
 * All coordinates are 0-1 relative to logical stage (1080x1920)
 */

export interface NormalizedCanvasItem {
  id: string;
  src: string; // URL to wardrobe item image
  wardrobeItemId: string;
  
  // Normalized coordinates (0-1 range, relative to stage)
  x: number;        // 0 = left edge, 1 = right edge (center-based)
  y: number;        // 0 = top edge, 1 = bottom edge (center-based)
  w: number;        // Width as fraction of stage width
  h: number;        // Height as fraction of stage height (derived from w * aspect)
  
  // Natural dimensions (for aspect ratio calculations)
  naturalW: number;
  naturalH: number;
  
  // Transforms
  rotation: number;  // Degrees
  scaleX: number;    // Usually 1, or -1 for flipX
  scaleY: number;    // Usually 1
  flipX: boolean;
  flipY: boolean;
  
  // Display
  opacity: number;   // 0-1
  z: number;         // Z-index
  visible: boolean;
  locked: boolean;
}

export interface CanvasBackground {
  type: 'solid' | 'gradient' | 'pattern' | 'image';
  value: string;
}

export interface CanvasScene {
  version: number;   // Schema version for migrations
  stageWidth: number;  // Logical: 1080
  stageHeight: number; // Logical: 1920
  items: NormalizedCanvasItem[];
  background: CanvasBackground;
  metadata?: {
    title?: string;
    occasion?: string;
    isPublic: boolean;
  };
}

// Legacy type for migration
export interface LegacyCanvasLayer {
  id: string;
  wardrobeItem: {
    id: string;
    image_url: string;
    image_bg_removed_url: string | null;
  };
  transform: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    scale: number;
    rotation: number;
  };
  opacity: number;
  flipH: boolean;
  visible: boolean;
  zIndex: number;
}
