import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PublicBrandData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  bio?: string;
  website?: string;
  socials?: Record<string, string>;
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
      
      const { data, error } = await supabase
        .from('brands_public')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
  });
};

export const usePublicRetailerData = (retailerId?: string) => {
  return useQuery({
    queryKey: ['public-retailer-data', retailerId],
    queryFn: async (): Promise<PublicBrandData | null> => {
      if (!retailerId) return null;
      
      const { data, error } = await supabase
        .from('retailers_public')
        .select('*')
        .eq('id', retailerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!retailerId,
  });
};

export const usePublicBrandsList = () => {
  return useQuery({
    queryKey: ['public-brands-list'],
    queryFn: async (): Promise<PublicBrandData[]> => {
      const { data, error } = await supabase
        .from('brands_public')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
};

export const usePublicRetailersList = () => {
  return useQuery({
    queryKey: ['public-retailers-list'],
    queryFn: async (): Promise<PublicBrandData[]> => {
      const { data, error } = await supabase
        .from('retailers_public')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
};