import { useState, useEffect, useCallback, useRef } from 'react';
import { imagePreloader } from '@/services/imagePreloader';
import { useAuth } from '@/contexts/AuthContext';

interface PreloadProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

interface UseImagePreloaderResult {
  isPreloading: boolean;
  progress: PreloadProgress;
  preloadImages: (products: any[]) => Promise<void>;
  cancel: () => void;
  isImagePreloaded: (url: string) => boolean;
}

export const useImagePreloader = (): UseImagePreloaderResult => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    percentage: 0
  });

  const { user } = useAuth();
  const mountedRef = useRef(true);

  const handleProgress = useCallback((newProgress: PreloadProgress) => {
    if (!mountedRef.current) return;
    setProgress(newProgress);
  }, []);

  const handleCompletion = useCallback(() => {
    if (!mountedRef.current) return;
    setIsPreloading(false);
  }, []);

  const preloadImages = useCallback(async (products: any[]) => {
    if (!products || products.length === 0) return;

    setIsPreloading(true);
    setProgress({ total: 0, completed: 0, failed: 0, percentage: 0 });

    // Set up callbacks
    imagePreloader.setProgressCallback(handleProgress);
    imagePreloader.setCompletionCallback(handleCompletion);

    try {
      await imagePreloader.preloadProductImages(products);
    } catch (error) {
      console.warn('Image preloading error:', error);
      if (mountedRef.current) {
        setIsPreloading(false);
      }
    }
  }, [handleProgress, handleCompletion]);

  const cancel = useCallback(() => {
    imagePreloader.cancel();
    if (mountedRef.current) {
      setIsPreloading(false);
    }
  }, []);

  const isImagePreloaded = useCallback((url: string) => {
    return imagePreloader.isImagePreloaded(url);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      imagePreloader.cancel();
    };
  }, []);

  // Auto-cancel when user logs out
  useEffect(() => {
    if (!user) {
      cancel();
    }
  }, [user, cancel]);

  return {
    isPreloading,
    progress,
    preloadImages,
    cancel,
    isImagePreloaded
  };
};