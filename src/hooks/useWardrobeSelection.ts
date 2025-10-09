import { useState, useCallback } from 'react';

interface WardrobeSelectionState {
  selectedItems: string[];
  toggleItem: (itemId: string) => void;
  selectAll: (itemIds: string[]) => void;
  deselectAll: () => void;
  hasSelection: boolean;
}

export const useWardrobeSelection = (): WardrobeSelectionState => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleItem = useCallback((itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const selectAll = useCallback((itemIds: string[]) => {
    setSelectedItems(itemIds);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedItems([]);
  }, []);

  return {
    selectedItems,
    toggleItem,
    selectAll,
    deselectAll,
    hasSelection: selectedItems.length > 0,
  };
};
