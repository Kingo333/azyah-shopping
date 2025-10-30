import { useState, useEffect, useRef, useCallback } from 'react';
import { layerPositionManager } from '@/lib/layerPositionManager';
import { useUpdateLayerSelection } from './useWardrobeLayers';
import { WardrobeItem } from './useWardrobeItems';

interface UseLayerPositionProps {
  layerId: string;
  items: WardrobeItem[];
  selectedItemId?: string | null;
  onPositionChange?: (position: number, itemId: string) => void;
}

/**
 * Hook for managing layer position state
 * Provides optimistic UI updates with debounced DB sync
 */
export const useLayerPosition = ({
  layerId,
  items,
  selectedItemId,
  onPositionChange,
}: UseLayerPositionProps) => {
  const updateLayerSelection = useUpdateLayerSelection();
  
  // Initialize position from manager or find index of selectedItemId
  const getInitialPosition = useCallback(() => {
    if (selectedItemId) {
      const index = items.findIndex(item => item.id === selectedItemId);
      if (index !== -1) return index;
    }
    return layerPositionManager.getPosition(layerId);
  }, [layerId, items, selectedItemId]);

  const [position, setPositionState] = useState(getInitialPosition);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastSyncedPositionRef = useRef(position);

  // Wrap position to valid range
  const wrappedPosition = items.length > 0 
    ? ((position % items.length) + items.length) % items.length 
    : 0;
  
  const currentItem = items[wrappedPosition] ?? null;

  /**
   * Set position and sync to manager
   */
  const setPosition = useCallback((newPosition: number) => {
    const wrapped = items.length > 0 
      ? ((newPosition % items.length) + items.length) % items.length 
      : 0;
    
    setPositionState(wrapped);
    layerPositionManager.setPosition(layerId, wrapped);
    
    // Notify parent
    if (currentItem && onPositionChange) {
      onPositionChange(wrapped, items[wrapped]?.id);
    }
  }, [items, layerId, currentItem, onPositionChange]);

  /**
   * Navigate to next item
   */
  const goNext = useCallback(() => {
    setPosition(position + 1);
  }, [position, setPosition]);

  /**
   * Navigate to previous item
   */
  const goPrev = useCallback(() => {
    setPosition(position - 1);
  }, [position, setPosition]);

  /**
   * Shuffle to random position (different from current)
   */
  const shuffle = useCallback(() => {
    if (items.length <= 1) return;
    
    const increment = Math.floor(Math.random() * (items.length - 1)) + 1;
    setPosition(position + increment);
  }, [items.length, position, setPosition]);

  /**
   * Sync position changes to database with debounce
   */
  useEffect(() => {
    if (items.length === 0 || !currentItem) return;

    // Only sync if position actually changed
    if (lastSyncedPositionRef.current === wrappedPosition) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce DB update
    debounceTimerRef.current = setTimeout(() => {
      console.log(`💾 [${layerId}] Syncing position ${wrappedPosition} → DB (item: ${currentItem.id})`);
      
      updateLayerSelection.mutate({
        layerId,
        itemId: currentItem.id,
      });
      
      lastSyncedPositionRef.current = wrappedPosition;
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [wrappedPosition, currentItem, layerId, items.length]);

  /**
   * Listen to external position changes from manager
   */
  useEffect(() => {
    const unsubscribe = layerPositionManager.subscribe((changedLayerId, newPosition) => {
      if (changedLayerId === layerId) {
        setPositionState(newPosition);
      }
    });

    return unsubscribe;
  }, [layerId]);

  /**
   * Sync initial position to manager
   */
  useEffect(() => {
    const initialPos = getInitialPosition();
    layerPositionManager.setPosition(layerId, initialPos);
    setPositionState(initialPos);
  }, [layerId, getInitialPosition]);

  return {
    position: wrappedPosition,
    currentItem,
    goNext,
    goPrev,
    shuffle,
    setPosition,
  };
};
