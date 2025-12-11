import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { WardrobeItem } from './useWardrobeItems';

export interface SuggestedEssential extends WardrobeItem {
  isSuggested: true;
  ownerUsername?: string;
}

export const useSuggestedEssentials = (enabled: boolean = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suggested-essentials'],
    queryFn: async () => {
      // Fetch public wardrobe items from the community (not from current user)
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('public_reuse_permitted', true)
        .neq('user_id', user?.id || '') // Exclude current user's items
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
