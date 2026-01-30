import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedProduct {
  title: string | null;
  image: string | null;
  brand: string | null;
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
}

interface PriceStats {
  low: number | null;
  median: number | null;
  high: number | null;
  valid_count: number;
}

interface DealsFromUrlResult {
  success: boolean;
  input_url: string;
  extracted_product: ExtractedProduct;
  shopping_results: ShoppingResult[];
  price_stats: PriceStats;
  deals_found: number;
  error?: string;
}

export function useDealsFromUrl() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DealsFromUrlResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchFromUrl = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'deals-from-url',
        {
          body: { url },
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
      console.error('useDealsFromUrl error:', err);
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
    searchFromUrl,
    data,
    isLoading,
    error,
    reset,
  };
}
