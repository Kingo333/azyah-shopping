import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  image_bg_removed_url: string | null;
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'jewelry' | 'bag';
  color: string | null;
  season: 'spring' | 'summer' | 'fall' | 'winter' | null;
  brand: string | null;
  is_favorite: boolean;
  created_at: string;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      toast.success('Item added to wardrobe');
    },
    onError: (error) => {
      console.error('Error adding wardrobe item:', error);
      toast.error('Failed to add item to wardrobe');
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
      toast.success('Item removed from wardrobe');
    },
    onError: (error) => {
      console.error('Error deleting wardrobe item:', error);
      toast.error('Failed to remove item');
    },
  });
};
