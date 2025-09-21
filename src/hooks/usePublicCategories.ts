import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PublicCategoryData {
  slug: string;
  name: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
}

/**
 * Hook for fetching public category data (safe fields only)
 * Available to all users including anonymous
 * Uses secure RPC function with limited data exposure
 */
export const usePublicCategories = () => {
  return useQuery({
    queryKey: ['public-categories'],
    queryFn: async (): Promise<PublicCategoryData[]> => {
      const { data, error } = await supabase.rpc('get_public_categories');

      if (error) {
        console.error('Failed to fetch public categories:', error);
        throw error;
      }
      
      // Transform data to match interface
      const transformedData = (data || []).map((item: any) => ({
        slug: item.slug,
        name: item.name,
        description: item.description,
        image_url: item.image_url,
        sort_order: item.sort_order
      }));
      
      return transformedData;
    },
  });
};