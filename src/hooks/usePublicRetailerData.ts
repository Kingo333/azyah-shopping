import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface PublicRetailerData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
  socials: Json | null;
  shipping_regions: string[] | null;
  cover_image_url: string | null;
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
      
      const { data, error } = await supabase
        .from('retailers_public')
        .select('*')
        .eq('id', retailerId)
        .single();

      if (error) {
        console.error('Failed to fetch public retailer data:', error);
        throw error;
      }
      
      return data;
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
      const { data, error } = await supabase
        .from('retailers_public')
        .select('*')
        .order('name')
        .limit(limit);

      if (error) {
        console.error('Failed to fetch public retailers list:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};