
import { useRef, useCallback, useEffect } from 'react';

const MAX_ENTRIES = 5;
const CLEANUP_INTERVAL = 5000; // 5 seconds

export const useSwipePerformance = () => {
  const viewStartTimesRef = useRef<Map<string, number>>(new Map());
  const lastCleanupRef = useRef<number>(Date.now());

  // Aggressive cleanup function
  const performCleanup = useCallback(() => {
    const now = Date.now();
    
    // Clear old view tracking data
    if (viewStartTimesRef.current.size > MAX_ENTRIES) {
      const entries = Array.from(viewStartTimesRef.current.entries());
      const recentEntries = entries.slice(-MAX_ENTRIES);
      viewStartTimesRef.current.clear();
      recentEntries.forEach(([key, value]) => {
        viewStartTimesRef.current.set(key, value);
      });
    }
    
    lastCleanupRef.current = now;
  }, []);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      performCleanup();
    }, CLEANUP_INTERVAL);

    return () => clearInterval(interval);
  }, [performCleanup]);

  const trackViewStart = useCallback((productId: string) => {
    if (viewStartTimesRef.current.size >= MAX_ENTRIES * 2) {
      performCleanup();
    }
    viewStartTimesRef.current.set(productId, Date.now());
  }, [performCleanup]);

  const getViewDuration = useCallback((productId: string): number => {
    const startTime = viewStartTimesRef.current.get(productId);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    viewStartTimesRef.current.delete(productId); // Immediate cleanup
    return duration;
  }, []);

  const clearAll = useCallback(() => {
    viewStartTimesRef.current.clear();
  }, []);

  return {
    trackViewStart,
    getViewDuration,
    clearAll,
    performCleanup
  };
};
