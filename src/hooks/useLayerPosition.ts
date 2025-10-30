import { useState, useEffect, useCallback, useRef } from 'react';
import { layerPositionManager } from '@/lib/layerPositionManager';
import { useUpdateLayerPosition } from './useWardrobeLayers';

interface UseLayerPositionOptions {
  layerId: string;
  items: Array<{ id: string }>;
  selectedItemId?: string | null;
  onPositionChange?: (position: number, itemId: string) => void;
}

export const useLayerPosition = ({
  layerId,
  items,
  selectedItemId,
  onPositionChange,
}: UseLayerPositionOptions) => {
  const [position, setPosition] = useState(0);
  const updateLayerPosition = useUpdateLayerPosition();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Initialize layer in manager
  useEffect(() => {
    const initialPosition = selectedItemId
      ? items.findIndex(item => item.id === selectedItemId)
      : 0;
    
    layerPositionManager.setLayer(
      layerId,
      items.length,
      initialPosition >= 0 ? initialPosition : 0
    );

    return () => {
      layerPositionManager.removeLayer(layerId);
    };
  }, [layerId, items.length, selectedItemId]);

  // Subscribe to position changes
  useEffect(() => {
    const unsubscribe = layerPositionManager.subscribe((positions) => {
      const layerPos = positions.get(layerId);
      if (layerPos) {
        setPosition(layerPos.position);
      }
    });

    return unsubscribe;
  }, [layerId]);

  // Immediate sync for position changes to DB
  useEffect(() => {
    if (items.length === 0) return;

    const wrappedPosition = ((position % items.length) + items.length) % items.length;
    const currentItem = items[wrappedPosition];

    if (!currentItem) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce DB update
    debounceTimerRef.current = setTimeout(() => {
      console.log(`💾 [${layerId}] Syncing position ${wrappedPosition} → DB (item: ${currentItem.id})`);
      
      updateLayerPosition.mutate({
        layerId,
        itemId: currentItem.id,
      });

      // Trigger callback
      onPositionChange?.(wrappedPosition, currentItem.id);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [position, items, layerId, onPositionChange, updateLayerPosition]);

  const goToPosition = useCallback((newPosition: number) => {
    layerPositionManager.updatePosition(layerId, newPosition);
  }, [layerId]);

  const next = useCallback(() => {
    layerPositionManager.next(layerId);
  }, [layerId]);

  const prev = useCallback(() => {
    layerPositionManager.prev(layerId);
  }, [layerId]);

  return {
    position,
    goToPosition,
    next,
    prev,
    currentItem: items[((position % items.length) + items.length) % items.length],
  };
};
