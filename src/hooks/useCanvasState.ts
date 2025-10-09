import { useState, useEffect, useCallback } from 'react';
import { CanvasLayer } from '@/components/EnhancedInteractiveCanvas';

interface CanvasState {
  layers: CanvasLayer[];
  background: {
    type: 'solid' | 'gradient' | 'pattern' | 'image';
    value: string;
  };
}

const AUTOSAVE_KEY = 'dressme_canvas_autosave';

export const useCanvasState = () => {
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [background, setBackground] = useState<{ type: 'solid' | 'gradient' | 'pattern' | 'image'; value: string }>({
    type: 'solid',
    value: '#FFFFFF',
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed: CanvasState = JSON.parse(saved);
        if (parsed.layers?.length > 0) {
          setLayers(parsed.layers);
          setBackground(parsed.background || { type: 'solid', value: '#FFFFFF' });
        }
      } catch (e) {
        console.error('Failed to load canvas state:', e);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (layers.length > 0) {
      const state: CanvasState = { layers, background };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
    }
  }, [layers, background]);

  const clearAutosave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
  }, []);

  const loadState = useCallback((state: CanvasState) => {
    setLayers(state.layers);
    setBackground(state.background);
  }, []);

  return {
    layers,
    setLayers,
    background,
    setBackground,
    clearAutosave,
    loadState,
  };
};
