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
  socials: any;
  shipping_regions: string[];
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
      
      // Use secure function for individual retailer safe fields
      const { data, error } = await supabase.rpc('get_retailer_safe_fields', {
        retailer_id_param: retailerId
      });

      if (error) {
        console.error('Failed to fetch public retailer data:', error);
        throw error;
      }
      
      return data?.[0] || null;
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
      // Use secure function for public retailers list
      const { data, error } = await supabase.rpc('get_public_retailers');

      if (error) {
        console.error('Failed to fetch public retailers list:', error);
        throw error;
      }
      
      // Map to ensure all fields are present
      return (data || []).map((retailer: any) => ({
        id: retailer.id,
        name: retailer.name,
        slug: retailer.slug,
        logo_url: retailer.logo_url,
        bio: retailer.bio,
        website: retailer.website || null,
        socials: retailer.socials || {},
        shipping_regions: retailer.shipping_regions || [],
        cover_image_url: retailer.cover_image_url || null,
        created_at: retailer.created_at,
        updated_at: retailer.updated_at,
      }));
    },
  });
};