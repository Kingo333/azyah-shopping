import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecureBrandData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  bio?: string;
  website?: string;
  contact_email?: string;
  owner_user_id?: string;
  socials?: any; // Use any to match Supabase Json type
  shipping_regions?: string[];
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
}

export const useSecureBrandData = (brandId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['secure-brand-data', brandId, user?.id],
    queryFn: async (): Promise<SecureBrandData | null> => {
      if (!brandId) return null;
      
      const { data, error } = await supabase
        .from('brands')
        .select(`
          id,
          name,
          slug,
          logo_url,
          bio,
          website,
          contact_email,
          owner_user_id,
          socials,
          shipping_regions,
          cover_image_url,
          created_at,
          updated_at
        `)
        .eq('id', brandId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!brandId && !!user,
  });
};

export const useSecureRetailerData = (retailerId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['secure-retailer-data', retailerId, user?.id],
    queryFn: async (): Promise<SecureBrandData | null> => {
      if (!retailerId) return null;
      
      const { data, error } = await supabase
        .from('retailers')
        .select(`
          id,
          name,
          slug,
          logo_url,
          bio,
          website,
          contact_email,
          owner_user_id,
          socials,
          shipping_regions,
          cover_image_url,
          created_at,
          updated_at
        `)
        .eq('id', retailerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!retailerId && !!user,
  });
};