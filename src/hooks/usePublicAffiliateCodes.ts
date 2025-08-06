
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublicAffiliateCode {
  id: string;
  brand_name: string;
  description: string | null;
  affiliate_url: string;
  affiliate_code: string | null;
  expiry_date: string | null;
  clicks: number;
  orders: number;
}

export const usePublicAffiliateCodes = (userId: string | undefined) => {
  const [codes, setCodes] = useState<PublicAffiliateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPublicCodes = async () => {
      try {
        const { data, error } = await supabase
          .from('affiliate_links')
          .select('id, brand_name, description, affiliate_url, affiliate_code, expiry_date, clicks, orders')
          .eq('user_id', userId)
          .eq('is_public', true)
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCodes(data || []);
      } catch (err) {
        console.error('Error fetching public affiliate codes:', err);
        setError('Failed to load affiliate codes');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCodes();
  }, [userId]);

  return { codes, loading, error };
};
