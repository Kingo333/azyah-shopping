import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CatalogMatch {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_url: string;
  category_slug: string | null;
  brand_name: string | null;
  match_score: number;
}

interface MatchCatalogResult {
  success: boolean;
  matches: CatalogMatch[];
  total_found: number;
  error?: string;
}

export function useDealsMatchCatalog() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MatchCatalogResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchCatalog = useCallback(async (queryTitle: string, category?: string, priceCents?: number) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'deals-match-catalog',
        {
          body: { 
            query_title: queryTitle, 
            category, 
            price_cents: priceCents,
            limit: 8 
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to match catalog');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to match catalog');
      }

      setData(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useDealsMatchCatalog error:', err);
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
    matchCatalog,
    data,
    isLoading,
    error,
    reset,
  };
}
