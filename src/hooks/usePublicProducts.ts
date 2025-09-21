import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('Fetching public products with params:', { limit, offset, categoryFilter });
      
      // Use secure RPC function instead of direct table access
      const { data, error } = await supabase.rpc('get_public_products', {
        p_limit: limit,
        p_offset: offset,
        p_category: categoryFilter || null
      });
      
      if (error) {
        console.error('Failed to fetch public products:', error);
        throw error;
      }

      // Transform the secure data to match expected interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: '', // Not exposed in public view for security
        price_cents: item.price_cents,
        currency: item.currency,
        image_url: item.image_url,
        media_urls: Array.isArray(item.media_urls) ? item.media_urls : [],
        external_url: item.external_url,
        category_slug: item.category_slug,
        subcategory_slug: item.subcategory_slug,
        gender: '', // Not exposed for security
        tags: [], // Not exposed for security
        status: 'active', // All public products are active
        is_external: !!item.external_url,
        merchant_name: item.brand_info?.name || '',
        brand_id: item.brand_info?.id || '',
        retailer_id: '',
        created_at: item.created_at,
        updated_at: item.created_at,
        brand: item.brand_info || { name: '', slug: '', logo_url: '' },
        retailer: null
      }));
      
      console.log('Successfully fetched products:', transformedData.length, 'items');
      return transformedData;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};