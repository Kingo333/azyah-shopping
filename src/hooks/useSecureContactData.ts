import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContactData {
  contact_email: string | null;
  owner_user_id: string | null;
}

/**
 * Secure hook to fetch brand contact information
 * Requires authentication and logs access for audit
 */
export const useBrandContactData = (brandId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['brand-contact-data', brandId],
    queryFn: async (): Promise<ContactData | null> => {
      if (!brandId || !user) return null;
      
      const { data, error } = await supabase.rpc('get_brand_contact_info', {
        brand_id_param: brandId
      });

      if (error) {
        console.error('Failed to fetch brand contact data:', error);
        throw error;
      }
      
      return data?.[0] || null;
    },
    enabled: !!brandId && !!user,
  });
};

/**
 * Secure hook to fetch retailer contact information  
 * Requires authentication and logs access for audit
 */
export const useRetailerContactData = (retailerId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['retailer-contact-data', retailerId],
    queryFn: async (): Promise<ContactData | null> => {
      if (!retailerId || !user) return null;
      
      const { data, error } = await supabase.rpc('get_retailer_contact_info', {
        retailer_id_param: retailerId
      });

      if (error) {
        console.error('Failed to fetch retailer contact data:', error);
        throw error;
      }
      
      return data?.[0] || null;
    },
    enabled: !!retailerId && !!user,
  });
};