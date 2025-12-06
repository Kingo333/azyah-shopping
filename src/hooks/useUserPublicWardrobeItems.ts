import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WardrobeItem } from './useWardrobeItems';

/**
 * Fetch public wardrobe items for a specific user (by user ID)
 * Used for suggestion mode where followers can create outfits for influencers
 */
export const useUserPublicWardrobeItems = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-public-wardrobe-items', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', userId)
        .eq('public_reuse_permitted', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WardrobeItem[];
    },
    enabled: !!userId,
  });
};

/**
 * Check if a user has any public wardrobe items
 * Used to show/hide "Style Me" button on profiles
 */
export const useHasPublicItems = (userId: string | null) => {
  return useQuery({
    queryKey: ['has-public-items', userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { count, error } = await supabase
        .from('wardrobe_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('public_reuse_permitted', true);

      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!userId,
  });
};
