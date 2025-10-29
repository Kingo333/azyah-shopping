import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WardrobeLayer {
  id: string;
  user_id: string;
  category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory';
  is_pinned: boolean;
  layer_order: number;
  selected_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useWardrobeLayers = () => {
  return useQuery({
    queryKey: ['wardrobe-layers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('wardrobe_layers')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('layer_order', { ascending: true });

      if (error) throw error;
      return data as WardrobeLayer[];
    },
  });
};

export const useAddWardrobeLayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: WardrobeLayer['category']) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current max order
      const { data: existing } = await supabase
        .from('wardrobe_layers')
        .select('layer_order')
        .eq('user_id', user.id)
        .order('layer_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].layer_order + 1 : 0;

      const { data, error } = await supabase
        .from('wardrobe_layers')
        .insert({
          user_id: user.id,
          category,
          layer_order: nextOrder,
          is_pinned: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WardrobeLayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-layers'] });
      toast.success('Layer added');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('You already have a layer for this category');
      } else {
        toast.error('Failed to add layer');
      }
    },
  });
};

export const useUpdateWardrobeLayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      is_pinned, 
      layer_order 
    }: { 
      id: string; 
      is_pinned?: boolean; 
      layer_order?: number;
    }) => {
      const updates: Partial<WardrobeLayer> = {};
      if (is_pinned !== undefined) updates.is_pinned = is_pinned;
      if (layer_order !== undefined) updates.layer_order = layer_order;

      const { data, error } = await supabase
        .from('wardrobe_layers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WardrobeLayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-layers'] });
    },
    onError: () => {
      toast.error('Failed to update layer');
    },
  });
};

export const useDeleteWardrobeLayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wardrobe_layers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-layers'] });
      toast.success('Layer removed');
    },
    onError: () => {
      toast.error('Failed to remove layer');
    },
  });
};

export const useUpdateLayerSelection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ layerId, itemId }: { layerId: string; itemId: string | null }) => {
      const { data, error } = await supabase
        .from('wardrobe_layers')
        .update({ selected_item_id: itemId })
        .eq('id', layerId)
        .select()
        .single();
      
      if (error) throw error;
      return data as WardrobeLayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-layers'] });
    },
    onError: () => {
      toast.error('Failed to update selection');
    },
  });
};
