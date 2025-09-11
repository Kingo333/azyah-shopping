import { useState, useEffect, useRef } from 'react';

interface UseStableLoadingOptions {
  minLoadingTime?: number;
  debounceTime?: number;
}

/**
 * Hook that provides stable loading states to prevent UI flickering
 * - Ensures minimum loading time to prevent flash
 * - Debounces rapid loading state changes
 * - Prevents skeleton loading from flickering on/off rapidly
 */
export const useStableLoading = (
  isLoading: boolean, 
  options: UseStableLoadingOptions = {}
) => {
  const { minLoadingTime = 500, debounceTime = 100 } = options;
  
  const [stableLoading, setStableLoading] = useState(isLoading);
  const [hasData, setHasData] = useState(false);
  const loadingStartTime = useRef<number | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (isLoading) {
      // Starting to load
      if (!loadingStartTime.current) {
        loadingStartTime.current = Date.now();
      }
      setStableLoading(true);
    } else {
      // Finished loading - debounce the change
      debounceTimer.current = setTimeout(() => {
        const now = Date.now();
        const loadingDuration = loadingStartTime.current 
          ? now - loadingStartTime.current 
          : minLoadingTime;

        if (loadingDuration < minLoadingTime) {
          // Not enough time has passed, wait for minimum time
          const remainingTime = minLoadingTime - loadingDuration;
          setTimeout(() => {
            setStableLoading(false);
            setHasData(true);
            loadingStartTime.current = null;
          }, remainingTime);
        } else {
          // Enough time has passed
          setStableLoading(false);
          setHasData(true);
          loadingStartTime.current = null;
        }
      }, debounceTime);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [isLoading, minLoadingTime, debounceTime]);

  return {
    isLoading: stableLoading,
    hasData,
    showSkeleton: stableLoading && !hasData
  };
};