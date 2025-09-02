import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface PublicBrandData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for fetching public brand data (safe fields only)
 * Available to all users including anonymous
 * Does NOT expose contact_email or owner_user_id
 */
export const usePublicBrandData = (brandId?: string) => {
  return useQuery({
    queryKey: ['public-brand-data', brandId],
    queryFn: async (): Promise<PublicBrandData | null> => {
      if (!brandId) return null;
      
      // Use secure function that requires authentication
      const { data, error } = await supabase.rpc('get_public_brands', {
        limit_param: 1000 // Get all brands, then filter client-side
      });

      if (error) {
        console.error('Failed to fetch public brand data:', error);
        throw error;
      }
      
      // Find the specific brand by ID
      const brand = data?.find((b: any) => b.id === brandId);
      return brand || null;
    },
    enabled: !!brandId,
  });
};

/**
 * Hook for fetching public brands list (safe fields only)
 * Available to all users including anonymous
 */
export const usePublicBrandsList = (limit = 50) => {
  return useQuery({
    queryKey: ['public-brands-list', limit],
    queryFn: async (): Promise<PublicBrandData[]> => {
      // Use secure function that requires authentication
      const { data, error } = await supabase.rpc('get_public_brands', {
        limit_param: limit
      });

      if (error) {
        console.error('Failed to fetch public brands list:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};