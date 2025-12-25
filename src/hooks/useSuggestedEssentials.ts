import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { WardrobeItem } from './useWardrobeItems';

// Standardized seed user for guest/default items
const SEED_USER_ID = 'd87d60a3-75d8-43ef-b97b-ce660fbf3199'; // shopper@test.com

export interface SuggestedEssential extends WardrobeItem {
  isSuggested: true;
  ownerUsername?: string;
}

export const useSuggestedEssentials = (enabled: boolean = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suggested-essentials'],
    queryFn: async () => {
      // Fetch wardrobe items from the seed user (shopper@test.com)
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', SEED_USER_ID)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      
      // Mark items as suggested
      return (data || []).map(item => ({
        ...item,
        isSuggested: true as const,
      })) as SuggestedEssential[];
    },
    enabled: enabled,
  });
};
