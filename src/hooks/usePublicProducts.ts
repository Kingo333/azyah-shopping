import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface PublicProductData {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  category_slug: string;
  subcategory_slug: string;
  gender: string | null;
  image_url: string | null;
  preview_media: Json;
  brand_name: string | null;
  brand_slug: string | null;
  brand_logo_url: string | null;
  created_at: string;
}

/**
 * Hook for fetching public product data (safe fields only)
 * Available to all users including anonymous
 * Uses secure RPC function with limited data exposure
 */
export const usePublicProducts = (
  limit = 20,
  offset = 0,
  categoryFilter?: string
) => {
  return useQuery({
    queryKey: ['public-products', limit, offset, categoryFilter],
    queryFn: async (): Promise<PublicProductData[]> => {
      const { data, error } = await supabase.rpc('get_public_products', {
        limit_param: limit,
        offset_param: offset,
        category_filter: categoryFilter || null
      });

      if (error) {
        console.error('Failed to fetch public products:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};