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
 * Uses direct table query following app patterns
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
      
      let query = supabase.from('products').select(`
        id,
        title,
        description,
        price_cents,
        currency,
        image_url,
        media_urls,
        external_url,
        category_slug,
        subcategory_slug,
        gender,
        tags,
        status,
        is_external,
        merchant_name,
        brand_id,
        retailer_id,
        created_at,
        updated_at,
        brand:brands(
          id,
          name,
          slug,
          logo_url
        ),
        retailer:retailers(
          id,
          name,
          slug,
          logo_url
        )
      `).eq('status', 'active');

      if (categoryFilter) {
        query = query.eq('category_slug', categoryFilter as any);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch public products:', error);
        throw error;
      }
      
      console.log('Successfully fetched products:', data?.length || 0, 'items');
      return data || [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};