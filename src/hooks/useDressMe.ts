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

// Seeded RNG for consistent shuffle behavior
const seededRng = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    return ((t ^ (t >>> 15)) >>> 0) / 2 ** 32;
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
    const rng = seededRng(Date.now());

    for (const category of activeCategories) {
      if (pinnedCategories[category] && currentOutfit[category]) {
        // Keep pinned item
        newOutfit[category] = currentOutfit[category];
      } else {
        // Get items excluding current selection to ensure new pick
        const items = getItemsByCategory(category);
        if (items.length > 1) {
          const currentId = currentOutfit[category]?.id;
          const pool = items.filter(item => item.id !== currentId);
          const randomIndex = Math.floor(rng() * pool.length);
          newOutfit[category] = pool[randomIndex] ?? items[0];
        } else if (items.length === 1) {
          newOutfit[category] = items[0];
        } else {
          newOutfit[category] = null;
        }
      }
    }

    return newOutfit;
  }, []);

  return { shuffleOutfit };
};
