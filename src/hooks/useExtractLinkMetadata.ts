import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExtractedMetadata {
  url: string;
  title: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
}

interface UseExtractLinkMetadataResult {
  extract: (url: string) => Promise<ExtractedMetadata | null>;
  data: ExtractedMetadata | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export const useExtractLinkMetadata = (): UseExtractLinkMetadataResult => {
  const [data, setData] = useState<ExtractedMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async (url: string): Promise<ExtractedMetadata | null> => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      const { data: response, error: fetchError } = await supabase.functions.invoke(
        'extract-link-metadata',
        {
          body: { url },
        }
      );

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to extract metadata');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to extract metadata');
      }

      const metadata = response.data as ExtractedMetadata;
      setData(metadata);
      return metadata;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error extracting link metadata:', err);
      
      // Return minimal data even on error
      const fallback: ExtractedMetadata = {
        url,
        title: null,
        image_url: null,
        price_cents: null,
        currency: null,
        brand_name: null,
        brand_logo_url: null,
      };
      setData(fallback);
      return fallback;
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
    extract,
    data,
    isLoading,
    error,
    reset,
  };
};
