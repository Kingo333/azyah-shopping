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
      
      // Use secure function that requires authentication for contact data
      const { data, error } = await supabase.rpc('get_brand_contact_secure', {
        brand_id_param: brandId
      });

      if (error) {
        console.error('Failed to fetch secure brand data:', error);
        throw error;
      }
      
      // Get safe public data
      const { data: publicData, error: publicError } = await supabase
        .from('brands_public')
        .select('*')
        .eq('id', brandId)
        .single();

      if (publicError) throw publicError;
      
      // Combine public data with contact info for authenticated users
      return {
        ...publicData,
        contact_email: data?.[0]?.contact_email || null,
        owner_user_id: data?.[0]?.owner_user_id || null,
      };
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
      
      // Use secure function that requires authentication for contact data
      const { data, error } = await supabase.rpc('get_retailer_contact_secure', {
        retailer_id_param: retailerId
      });

      if (error) {
        console.error('Failed to fetch secure retailer data:', error);
        throw error;
      }
      
      // Get safe public data
      const { data: publicData, error: publicError } = await supabase
        .from('retailers_public')
        .select('*')
        .eq('id', retailerId)
        .single();

      if (publicError) throw publicError;
      
      // Combine public data with contact info for authenticated users
      return {
        ...publicData,
        contact_email: data?.[0]?.contact_email || null,
        owner_user_id: data?.[0]?.owner_user_id || null,
      };
    },
    enabled: !!retailerId && !!user,
  });
};