import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface PublicRetailerData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for fetching public retailer data (safe fields only)
 * Available to all users including anonymous
 * Does NOT expose contact_email or owner_user_id
 */
export const usePublicRetailerData = (retailerId?: string) => {
  return useQuery({
    queryKey: ['public-retailer-data', retailerId],
    queryFn: async (): Promise<PublicRetailerData | null> => {
      if (!retailerId) return null;
      
      // Use secure function that requires authentication
      const { data, error } = await supabase.rpc('get_public_retailers', {
        limit_param: 1000 // Get all retailers, then filter client-side
      });

      if (error) {
        console.error('Failed to fetch public retailer data:', error);
        throw error;
      }
      
      // Find the specific retailer by ID
      const retailer = data?.find((r: any) => r.id === retailerId);
      return retailer || null;
    },
    enabled: !!retailerId,
  });
};

/**
 * Hook for fetching public retailers list (safe fields only)
 * Available to all users including anonymous
 */
export const usePublicRetailersList = (limit = 50) => {
  return useQuery({
    queryKey: ['public-retailers-list', limit],
    queryFn: async (): Promise<PublicRetailerData[]> => {
      // Use secure function that requires authentication
      const { data, error } = await supabase.rpc('get_public_retailers', {
        limit_param: limit
      });

      if (error) {
        console.error('Failed to fetch public retailers list:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};