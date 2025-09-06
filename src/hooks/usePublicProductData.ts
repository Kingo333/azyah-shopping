import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PublicProductData {
  id: string;
  title: string;
  brand_id: string;
  brand_logo: string;
  brand_name: string;
  brand_slug: string;
  category_name: string;
  category_slug: string;
  retailer_id: string;
  status: string;
  created_at: string;
}

/**
 * Hook for fetching safe public product data (limited fields only)
 * Available to all users including anonymous
 * Does NOT expose sensitive product details, descriptions, or full media
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

/**
 * Hook for fetching safe public categories
 * Available to all users including anonymous
 */
export const usePublicCategories = () => {
  return useQuery({
    queryKey: ['public-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_categories');

      if (error) {
        console.error('Failed to fetch public categories:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};