import { useRef, useCallback } from 'react';

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
    if (memoryRef.current.seenProducts.size > 500) {
      // Keep only the most recent 300 products
      const productsArray = Array.from(memoryRef.current.seenProducts);
      const recentProducts = productsArray.slice(-300);
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
