import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Outfit {
  id: string;
  user_id: string;
  outfit_data: Record<string, string>; // category -> item_id mapping
  occasion: string | null;
  name: string | null;
  image_preview: string | null;
  created_at: string;
}

export const useSavedOutfits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['outfits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Outfit[];
    },
    enabled: !!user,
  });
};

export const useSaveOutfit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (outfit: Omit<Outfit, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('outfits')
        .insert({
          ...outfit,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast.success('Outfit saved!');
    },
    onError: (error) => {
      console.error('Error saving outfit:', error);
      toast.error('Failed to save outfit');
    },
  });
};

export const useDeleteOutfit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast.success('Outfit deleted');
    },
    onError: (error) => {
      console.error('Error deleting outfit:', error);
      toast.error('Failed to delete outfit');
    },
  });
};

export const useUpdateOutfit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Outfit> }) => {
      const { data, error } = await supabase
        .from('outfits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast.success('Outfit updated');
    },
    onError: (error) => {
      console.error('Error updating outfit:', error);
      toast.error('Failed to update outfit');
    },
  });
};
