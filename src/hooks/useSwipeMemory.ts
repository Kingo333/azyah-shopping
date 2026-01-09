import { useRef, useCallback } from 'react';

const MAX_SEEN_PRODUCTS = 200;
const CLEANUP_BATCH_SIZE = 50;

interface SwipeMemoryState {
  seenProducts: Set<string>;
  lastSwipeTime: number;
  swipeCount: number;
}

export const useSwipeMemory = () => {
  const memoryRef = useRef<SwipeMemoryState>({
    seenProducts: new Set(),
    lastSwipeTime: 0,
    swipeCount: 0
  });

  const addSeenProduct = useCallback((productId: string) => {
    // If at capacity, remove oldest entries (LRU-like behavior)
    if (memoryRef.current.seenProducts.size >= MAX_SEEN_PRODUCTS) {
      const iterator = memoryRef.current.seenProducts.values();
      // Remove first batch of entries
      for (let i = 0; i < CLEANUP_BATCH_SIZE; i++) {
        const oldest = iterator.next().value;
        if (oldest) memoryRef.current.seenProducts.delete(oldest);
      }
    }
    
    memoryRef.current.seenProducts.add(productId);
    memoryRef.current.lastSwipeTime = Date.now();
    memoryRef.current.swipeCount += 1;
  }, []);

  const hasSeenProduct = useCallback((productId: string) => {
    return memoryRef.current.seenProducts.has(productId);
  }, []);

  const getMemoryStats = useCallback(() => {
    return {
      seenCount: memoryRef.current.seenProducts.size,
      lastSwipeTime: memoryRef.current.lastSwipeTime,
      swipeCount: memoryRef.current.swipeCount
    };
  }, []);

  const clearMemory = useCallback(() => {
    memoryRef.current.seenProducts.clear();
    memoryRef.current.lastSwipeTime = 0;
    memoryRef.current.swipeCount = 0;
  }, []);

  // Cleanup old seen products if memory gets too large
  const optimizeMemory = useCallback(() => {
    if (memoryRef.current.seenProducts.size > MAX_SEEN_PRODUCTS) {
      // Keep only the most recent 100 products
      const productsArray = Array.from(memoryRef.current.seenProducts);
      const recentProducts = productsArray.slice(-100);
      memoryRef.current.seenProducts = new Set(recentProducts);
    }
  }, []);

  return {
    addSeenProduct,
    hasSeenProduct,
    getMemoryStats,
    clearMemory,
    optimizeMemory
  };
};
