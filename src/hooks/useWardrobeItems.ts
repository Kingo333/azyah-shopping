import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { awardPointsAsync } from '@/hooks/useAwardPoints';

export interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  image_bg_removed_url: string | null;
  category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory';
  color: string | null;
  season: 'spring' | 'summer' | 'fall' | 'winter' | null;
  brand: string | null;
  is_favorite: boolean;
  tags: string[] | null;
  source: string | null;
  public_reuse_permitted: boolean;
  attribution_user_id: string | null;
  thumb_path: string | null;
  created_at: string;
  // Product source linking fields
  source_product_id?: string | null;
  source_url?: string | null;
  source_vendor_name?: string | null;
}

export const useWardrobeItems = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wardrobe-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WardrobeItem[];
    },
    enabled: !!user,
  });
};

// Get friend's public wardrobe items
export const useFriendWardrobeItems = (friendId: string | null) => {
  return useQuery({
    queryKey: ['friend-wardrobe-items', friendId],
    queryFn: async () => {
      if (!friendId) return [];
      
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', friendId)
        .eq('public_reuse_permitted', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WardrobeItem[];
    },
    enabled: !!friendId,
  });
};

export const useWardrobeItemsByCategory = (category: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wardrobe-items', user?.id, category],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WardrobeItem[];
    },
    enabled: !!user && !!category,
  });
};

export const useAddWardrobeItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (item: Omit<WardrobeItem, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('User not authenticated');

      // Check limit before inserting
      const { data: canAdd, error: checkError } = await supabase
        .rpc('can_add_wardrobe_item', { target_user_id: user.id });

      if (checkError) throw checkError;
      
      if (!canAdd) {
        throw new Error('Wardrobe item limit reached. Upgrade to premium for unlimited items.');
      }

      const { data, error } = await supabase
        .from('wardrobe_items')
        .insert({
          ...item,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      queryClient.invalidateQueries({ queryKey: ['wardrobe-limit'] });
      toast.success('Item added to wardrobe');
      
      // Award points for adding wardrobe item (fire and forget)
      if (data?.id) {
        awardPointsAsync('wardrobe_add', data.id, `wardrobe:${data.id}`);
      }
    },
    onError: (error: any) => {
      console.error('Error adding wardrobe item:', error);
      if (error.message.includes('limit reached')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to add item to wardrobe');
      }
    },
  });
};

export const useUpdateWardrobeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WardrobeItem> }) => {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      toast.success('Item updated');
    },
    onError: (error) => {
      console.error('Error updating wardrobe item:', error);
      toast.error('Failed to update item');
    },
  });
};

export const useDeleteWardrobeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wardrobe_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      queryClient.invalidateQueries({ queryKey: ['wardrobe-limit'] });
      toast.success('Item removed', { duration: 2000 });
    },
    onError: (error) => {
      console.error('Error deleting wardrobe item:', error);
      toast.error('Failed to remove item');
    },
  });
};

// Hook to check wardrobe item limit (excludes default items from count)
export const useWardrobeLimit = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wardrobe-limit', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [limitResult, countResult] = await Promise.all([
        supabase.rpc('get_wardrobe_limit', { target_user_id: user.id }),
        supabase
          .from('wardrobe_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .or('is_default.is.null,is_default.eq.false') // Exclude default items
      ]);

      if (limitResult.error) throw limitResult.error;
      if (countResult.error) throw countResult.error;

      return {
        current: countResult.count || 0,
        max: limitResult.data,
        isPremium: limitResult.data >= 999,
        canAdd: (countResult.count || 0) < limitResult.data
      };
    },
    enabled: !!user,
  });
};
