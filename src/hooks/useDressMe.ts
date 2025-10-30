import { useState, useCallback } from 'react';
import { WardrobeItem, useWardrobeItemsByCategory } from './useWardrobeItems';

export const useDressMe = () => {
  const [selectedOutfit, setSelectedOutfit] = useState<Record<string, WardrobeItem | null>>({});
  const [pinnedCategories, setPinnedCategories] = useState<Record<string, boolean>>({});

  const togglePin = useCallback((category: string) => {
    setPinnedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  const selectItem = useCallback((category: string, item: WardrobeItem | null) => {
    setSelectedOutfit(prev => ({
      ...prev,
      [category]: item
    }));
  }, []);

  return {
    selectedOutfit,
    pinnedCategories,
    togglePin,
    selectItem,
    setSelectedOutfit,
  };
};

export const useShuffleOutfit = () => {
  const shuffleOutfit = useCallback(async (
    activeCategories: string[],
    pinnedCategories: Record<string, boolean>,
    currentOutfit: Record<string, WardrobeItem | null>,
    getItemsByCategory: (category: string) => WardrobeItem[]
  ) => {
    const newOutfit: Record<string, WardrobeItem | null> = {};

    for (const category of activeCategories) {
      if (pinnedCategories[category] && currentOutfit[category]) {
        // Keep pinned item
        newOutfit[category] = currentOutfit[category];
      } else {
        // Get random item from category
        const items = getItemsByCategory(category);
        if (items.length > 0) {
          const randomIndex = Math.floor(Math.random() * items.length);
          newOutfit[category] = items[randomIndex];
        } else {
          newOutfit[category] = null;
        }
      }
    }

    return newOutfit;
  }, []);

  return { shuffleOutfit };
};
