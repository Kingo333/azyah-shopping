import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface XimilarTags {
  primary_category?: string | null;
  subcategory?: string | null;
  colors?: string[];
  patterns?: string[];
  is_pattern_mode?: boolean;
}

interface SubScores {
  pattern: number;
  silhouette: number;
  color: number;
}

export interface ShoppingResult {
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
  sub_scores?: SubScores;
  tag_agreement?: number;
  is_exact_match?: boolean;
}

interface VisualMatch {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
}

interface PriceStats {
  low: number | null;
  median: number | null;
  high: number | null;
  valid_count: number;
}

export interface ExactMatch {
  link: string;
  title: string;
  source: string;
  thumbnail?: string;
  price?: string;
  extracted_price?: number | null;
}

interface DebugInfo {
  timing_ms: {
    image_normalize: number;
    ximilar: number;
    lens: number;
    chips: number;
    shopping: number;
    rerank: number;
    total: number;
  };
  ximilar: {
    called: boolean;
    is_pattern_mode: boolean;
  };
  [key: string]: unknown;
}

export interface UnifiedDealsResult {
  success: boolean;
  exact_match?: ExactMatch | null;
  shopping_results: ShoppingResult[];
  visual_matches: VisualMatch[];
  price_stats: PriceStats;
  deals_found: number;
  ximilar_tags?: XimilarTags | null;
  debug?: DebugInfo;
  error?: string;
}

interface SearchUnifiedParams {
  source: 'app_upload' | 'chrome_extension' | 'safari_extension';
  market?: 'AE' | 'US' | 'UK';
  image_url: string;
  page_url?: string;
  title_hint?: string;
  price_hint?: number;
  currency_hint?: string;
}

export function useDealsUnified() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<UnifiedDealsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchUnified = useCallback(async (params: SearchUnifiedParams) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'deals-unified',
        {
          body: {
            source: params.source,
            market: params.market || 'AE',
            image_url: params.image_url,
            page_url: params.page_url,
            title_hint: params.title_hint,
            price_hint: params.price_hint,
            currency_hint: params.currency_hint,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to search deals');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to search deals');
      }

      setData(response as UnifiedDealsResult);
      return response as UnifiedDealsResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useDealsUnified error:', err);
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
    searchUnified,
    data,
    isLoading,
    error,
    reset,
  };
}
