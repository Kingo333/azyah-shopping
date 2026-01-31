import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ProductContext, 
  DealsFromContextResponse,
  VisualMatch,
  ShoppingResult,
  PriceStats 
} from '@/types/ProductContext';

export function useDealsFromContext() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DealsFromContextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchFromContext = useCallback(async (context: ProductContext) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'deals-from-context',
        {
          body: { context },
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
      console.error('useDealsFromContext error:', err);
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
    searchFromContext,
    data,
    isLoading,
    error,
    reset,
  };
}

// Re-export types for convenience
export type { ProductContext, DealsFromContextResponse, VisualMatch, ShoppingResult, PriceStats };
