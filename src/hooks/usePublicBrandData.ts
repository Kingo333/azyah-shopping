import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PublicBrandData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  bio?: string;
  website?: string;
  socials?: any; // Use any to match Supabase Json type
  shipping_regions?: string[];
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
}

export const usePublicBrandData = (brandId?: string) => {
  return useQuery({
    queryKey: ['public-brand-data', brandId],
    queryFn: async (): Promise<PublicBrandData | null> => {
      if (!brandId) return null;
      
      // Use secure accessor function that requires authentication
      const { data, error } = await supabase
        .rpc('get_public_brands', { limit_param: 1000 });

      if (error) throw error;
      
      // Find the specific brand from the returned data
      const brandData = data?.find((b: any) => b.id === brandId);
      return brandData || null;
    },
    enabled: !!brandId,
  });
};

export const usePublicRetailerData = (retailerId?: string) => {
  return useQuery({
    queryKey: ['public-retailer-data', retailerId],
    queryFn: async (): Promise<PublicBrandData | null> => {
      if (!retailerId) return null;
      
      // Use secure accessor function that requires authentication
      const { data, error } = await supabase
        .rpc('get_public_retailers', { limit_param: 1000 });

      if (error) throw error;
      
      // Find the specific retailer from the returned data
      const retailerData = data?.find((r: any) => r.id === retailerId);
      return retailerData || null;
    },
    enabled: !!retailerId,
  });
};

export const usePublicBrandsList = () => {
  return useQuery({
    queryKey: ['public-brands-list'],
    queryFn: async (): Promise<PublicBrandData[]> => {
      // Use secure accessor function that requires authentication
      const { data, error } = await supabase
        .rpc('get_public_brands', { limit_param: 1000 });

      if (error) throw error;
      return data || [];
    },
  });
};

export const usePublicRetailersList = () => {
  return useQuery({
    queryKey: ['public-retailers-list'],
    queryFn: async (): Promise<PublicBrandData[]> => {
      // Use secure accessor function that requires authentication
      const { data, error } = await supabase
        .rpc('get_public_retailers', { limit_param: 1000 });

      if (error) throw error;
      return data || [];
    },
  });
};