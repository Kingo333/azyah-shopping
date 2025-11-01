/**
 * Canvas Scene State Management Hook
 * Manages normalized canvas scene with autosave
 */

import { useState, useEffect, useCallback } from 'react';
import type { CanvasScene, NormalizedCanvasItem } from '@/types/canvas';
import type { WardrobeItem } from '@/hooks/useWardrobeItems';
import { calculateNormalizedSize } from '@/utils/canvasCoordinates';

const AUTOSAVE_KEY = 'dressme_canvas_autosave';
const STAGE_WIDTH = 1080;
const STAGE_HEIGHT = 1920;

export const useCanvasScene = () => {
  const [scene, setScene] = useState<CanvasScene>({
    version: 1,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    items: [],
    background: { type: 'solid', value: '#FFFFFF' },
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed: CanvasScene = JSON.parse(saved);
        if (parsed.items?.length > 0) {
          setScene(parsed);
        }
      } catch (e) {
        console.error('Failed to load canvas scene:', e);
      }
    }
  }, []);

  // Save to localStorage whenever scene changes
  useEffect(() => {
    if (scene.items.length > 0) {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(scene));
    }
  }, [scene]);

  const clearAutosave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
  }, []);

  const addItem = useCallback(async (wardrobeItem: WardrobeItem) => {
    const src = wardrobeItem.image_bg_removed_url || wardrobeItem.image_url;
    
    // Load image to get natural dimensions
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });

    const naturalW = img.naturalWidth || 1000;
    const naturalH = img.naturalHeight || 1000;

    // Calculate normalized size (25% of stage width by default)
    const { w, h } = calculateNormalizedSize(naturalW, naturalH, 0.25, STAGE_WIDTH, STAGE_HEIGHT);

    const newItem: NormalizedCanvasItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      src,
      wardrobeItemId: wardrobeItem.id,
      x: 0.5, // Center horizontally
      y: 0.5, // Center vertically
      w,
      h,
      naturalW,
      naturalH,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      flipX: false,
      flipY: false,
      opacity: 1,
      z: scene.items.length,
      visible: true,
      locked: false,
    };

    setScene(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    return newItem.id;
  }, [scene.items.length]);

  const updateItem = useCallback((itemId: string, updates: Partial<NormalizedCanvasItem>) => {
    setScene(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    }));
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setScene(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  }, []);

  const reorderItems = useCallback((items: NormalizedCanvasItem[]) => {
    setScene(prev => ({ ...prev, items }));
  }, []);

  const setBackground = useCallback((background: CanvasScene['background']) => {
    setScene(prev => ({ ...prev, background }));
  }, []);

  const clearScene = useCallback(() => {
    setScene({
      version: 1,
      stageWidth: STAGE_WIDTH,
      stageHeight: STAGE_HEIGHT,
      items: [],
      background: { type: 'solid', value: '#FFFFFF' },
    });
    clearAutosave();
  }, [clearAutosave]);

  return {
    scene,
    setScene,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    setBackground,
    clearScene,
    clearAutosave,
  };
};
