import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LensVisualMatch {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
}

interface ShoppingResult {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
  price: string;
  extracted_price: number | null;
  rating?: number;
  reviews?: number;
  position: number;
  similarity_score?: number;
}

interface PriceStats {
  low: number | null;
  median: number | null;
  high: number | null;
  valid_count: number;
}

interface PipelineLog {
  input_has_image: boolean;
  query_pack_count: number;
  raw_results_count: number;
  after_dedupe_count: number;
  final_returned_count: number;
  used_fallback_queries: boolean;
  brands_detected?: string[];
  patterns_detected?: string[];
}

interface DealsFromImageResult {
  success: boolean;
  input_image: string;
  visual_matches: LensVisualMatch[];
  shopping_results: ShoppingResult[];
  price_stats: PriceStats;
  deals_found: number;
  pipeline_log?: PipelineLog;
  cached?: boolean;
  error?: string;
}

export function useDealsFromImage() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DealsFromImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchFromImage = useCallback(async (imageUrl: string) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'deals-from-image',
        {
          body: { imageUrl },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to search deals');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to search deals');
      }

      setData(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useDealsFromImage error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Multi-crop search - sends multiple image URLs to backend
  const searchFromImages = useCallback(async (
    imageUrls: { url: string; cropType: 'full' | 'garment' | 'pattern' }[]
  ) => {
    if (!imageUrls || imageUrls.length === 0) {
      setError('No image provided');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Use primary crop (garment) for the main search
      const primaryImage = imageUrls.find(img => img.cropType === 'garment') || imageUrls[0];
      
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'deals-from-image',
        {
          body: { 
            imageUrl: primaryImage.url,
            // Include all crops for potential multi-crop search in future
            imageUrls: imageUrls.map(img => ({
              url: img.url,
              cropType: img.cropType,
            })),
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to search deals');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to search deals');
      }

      setData(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useDealsFromImage multi-crop error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    searchFromImage,
    searchFromImages,
    data,
    isLoading,
    error,
    reset,
  };
}
