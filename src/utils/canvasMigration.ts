/**
 * Canvas Data Migration Utilities
 * Convert old canvas data to normalized format
 */

import type { CanvasScene, NormalizedCanvasItem, LegacyCanvasLayer } from '@/types/canvas';

/**
 * Get natural dimensions from image URL
 */
async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      // Fallback dimensions
      resolve({ width: 1000, height: 1000 });
    };
    img.src = src;
  });
}

/**
 * Migrate old canvas data to normalized format
 */
export async function migrateToNormalized(
  oldLayers: LegacyCanvasLayer[],
  oldBackground: any
): Promise<CanvasScene> {
  
  const STAGE_WIDTH = 1080;
  const STAGE_HEIGHT = 1920;
  
  const items: NormalizedCanvasItem[] = await Promise.all(
    oldLayers.map(async (layer) => {
      const src = layer.wardrobeItem.image_bg_removed_url || layer.wardrobeItem.image_url;
      
      // Get natural dimensions
      const { width: naturalW, height: naturalH } = await getImageDimensions(src);
      
      // Old format used absolute pixels (0-1080, 0-1920)
      const normX = (layer.transform.x || STAGE_WIDTH / 2) / STAGE_WIDTH;
      const normY = (layer.transform.y || STAGE_HEIGHT / 2) / STAGE_HEIGHT;
      
      // Old format: width was "25% of stage * scale"
      // New format: w is the normalized width
      const baseW = 0.25; // 25% of stage
      const scale = layer.transform.scale || 1;
      const w = baseW * scale;
      
      // Calculate height from aspect ratio
      const aspectRatio = naturalH / naturalW;
      const stageAspectRatio = STAGE_HEIGHT / STAGE_WIDTH;
      const h = w * aspectRatio * stageAspectRatio;
      
      return {
        id: layer.id,
        src,
        wardrobeItemId: layer.wardrobeItem.id,
        x: normX,
        y: normY,
        w,
        h,
        naturalW,
        naturalH,
        rotation: layer.transform.rotation || 0,
        scaleX: layer.flipH ? -1 : 1,
        scaleY: 1,
        flipX: layer.flipH,
        flipY: false,
        opacity: layer.opacity || 1,
        z: layer.zIndex,
        visible: layer.visible !== false,
        locked: false,
      };
    })
  );
  
  return {
    version: 1,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    items,
    background: oldBackground || { type: 'solid', value: '#FFFFFF' },
  };
}

/**
 * Convert normalized scene back to legacy format (for compatibility)
 */
export function convertToLegacy(scene: CanvasScene): LegacyCanvasLayer[] {
  return scene.items.map(item => ({
    id: item.id,
    wardrobeItem: {
      id: item.wardrobeItemId,
      image_url: item.src,
      image_bg_removed_url: item.src,
    },
    transform: {
      x: item.x * scene.stageWidth,
      y: item.y * scene.stageHeight,
      scale: item.w / 0.25, // Reverse the base 25% calculation
      rotation: item.rotation,
    },
    opacity: item.opacity,
    flipH: item.flipX,
    visible: item.visible,
    zIndex: item.z,
  }));
}
