import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface PublicBrandData {
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
 * Hook for fetching public brand data (safe fields only)
 * Available to all users including anonymous
 * Does NOT expose contact_email or owner_user_id
 */
export const usePublicBrandData = (brandId?: string) => {
  return useQuery({
    queryKey: ['public-brand-data', brandId],
    queryFn: async (): Promise<PublicBrandData | null> => {
      if (!brandId) return null;
      
      // Use secure function for individual brand safe fields
      const { data, error } = await supabase.rpc('get_brand_safe_fields', {
        brand_id_param: brandId
      });

      if (error) {
        console.error('Failed to fetch public brand data:', error);
        throw error;
      }
      
      return data?.[0] || null;
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
      // Use secure function for public brands list
      const { data, error } = await supabase.rpc('get_public_brands');

      if (error) {
        console.error('Failed to fetch public brands list:', error);
        throw error;
      }
      
      // Map to ensure all fields are present
      return (data || []).map((brand: any) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logo_url: brand.logo_url,
        bio: brand.bio,
        website: brand.website || null,
        socials: brand.socials || {},
        shipping_regions: brand.shipping_regions || [],
        cover_image_url: brand.cover_image_url || null,
        created_at: brand.created_at,
        updated_at: brand.updated_at,
      }));
    },
  });
};