import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface PublicProductData {
  id: string;
  title: string;
  description: string;
  price_cents: number | null;
  currency: string;
  image_url: string;
  media_urls: any;
  external_url: string;
  category_slug: string;
  subcategory_slug: string;
  gender: string;
  tags: string[];
  status: string;
  is_external: boolean;
  merchant_name: string;
  brand_id: string;
  retailer_id: string;
  created_at: string;
  updated_at: string;
  brand: any;
  retailer: any;
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
      const { data, error } = await supabase.rpc('get_public_products_secure', {
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