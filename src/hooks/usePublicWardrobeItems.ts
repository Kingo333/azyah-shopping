import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicWardrobeItem {
  id: string;
  user_id: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  color: string | null;
  season: string[] | null;
  tags: string[] | null;
  image_url: string | null;
  image_bg_removed_url: string | null;
  created_at: string;
  public_reuse_permitted: boolean;
  attribution_user_id: string | null;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  };
}

export const usePublicWardrobeItems = (category?: string) => {
  return useQuery({
    queryKey: ['public-wardrobe-items', category],
    queryFn: async () => {
    let query = supabase
        .from('wardrobe_items')
        .select(`
          id,
          user_id,
          name,
          brand,
          category,
          color,
          season,
          tags,
          image_url,
          image_bg_removed_url,
          created_at
        `)
        .eq('public_reuse_permitted', true)
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user data separately
      const itemsWithUsers = await Promise.all(
        (data || []).map(async (item) => {
          const { data: userData } = await supabase
            .from('users')
            .select('id, username, name, avatar_url')
            .eq('id', item.user_id)
            .single();
          
          return {
            ...item,
            season: Array.isArray(item.season) ? item.season : item.season ? [item.season] : null,
            user: userData || { id: item.user_id, username: null, name: null, avatar_url: null },
          };
        })
      );
      
      return itemsWithUsers as PublicWardrobeItem[];
    },
  });
};

export const useWardrobeItem = (itemId: string) => {
  return useQuery({
    queryKey: ['wardrobe-item', itemId],
    queryFn: async () => {
    const { data, error } = await supabase
        .from('wardrobe_items')
        .select(`
          id,
          user_id,
          name,
          brand,
          category,
          color,
          season,
          tags,
          image_url,
          image_bg_removed_url,
          created_at,
          public_reuse_permitted,
          attribution_user_id
        `)
        .eq('id', itemId)
        .single();

      if (error) throw error;
      
      // Fetch user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, username, name, avatar_url')
        .eq('id', data.user_id)
        .single();
      
      return {
        ...data,
        season: Array.isArray(data.season) ? data.season : data.season ? [data.season] : null,
        user: userData || { id: data.user_id, username: null, name: null, avatar_url: null },
      } as PublicWardrobeItem;
    },
    enabled: !!itemId,
  });
};
