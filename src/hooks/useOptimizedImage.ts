import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedImageData {
  optimized_url: string;
  cached: boolean;
  dimensions?: {
    width: number;
    height: number;
    original_size: number;
  };
}

interface UseOptimizedImageProps {
  originalUrl: string;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  enabled?: boolean;
}

export const useOptimizedImage = ({
  originalUrl,
  targetWidth = 720,
  targetHeight = 1080,
  quality = 90,
  enabled = true
}: UseOptimizedImageProps) => {
  const [optimizedUrl, setOptimizedUrl] = useState<string>(originalUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!enabled || !originalUrl || originalUrl === '/placeholder.svg') {
      setOptimizedUrl(originalUrl);
      return;
    }

    // Only optimize external images (not local assets)
    const isExternalUrl = originalUrl.startsWith('http');
    if (!isExternalUrl) {
      setOptimizedUrl(originalUrl);
      return;
    }

    const optimizeImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Requesting image optimization for:', originalUrl);

        const { data, error: functionError } = await supabase.functions.invoke('optimize-image', {
          body: {
            original_url: originalUrl,
            target_width: targetWidth,
            target_height: targetHeight,
            quality
          }
        });

        if (functionError) {
          throw new Error(`Function error: ${functionError.message}`);
        }

        if (data?.optimized_url) {
          console.log('✅ Received optimized URL:', data.optimized_url);
          setOptimizedUrl(data.optimized_url);
          setCached(data.cached);
        } else {
          throw new Error('No optimized URL returned');
        }
      } catch (err) {
        console.warn('⚠️ Image optimization failed, using original:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setOptimizedUrl(originalUrl); // Fallback to original
      } finally {
        setIsLoading(false);
      }
    };

    optimizeImage();
  }, [originalUrl, targetWidth, targetHeight, quality, enabled]);

  return {
    src: optimizedUrl,
    isOptimizing: isLoading,
    error,
    cached,
    isOptimized: optimizedUrl !== originalUrl
  };
};