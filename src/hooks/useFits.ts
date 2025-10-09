import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Fit {
  id: string;
  user_id: string;
  title: string | null;
  canvas_json: any;
  render_path: string | null;
  is_public: boolean;
  like_count: number;
  occasion: string | null;
  created_at: string;
}

export interface FitItem {
  fit_id: string;
  wardrobe_item_id: string;
  z_index: number;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

// Get all fits for current user
export const useFits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('fits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Fit[];
    },
    enabled: !!user,
  });
};

// Get public fits (community)
export const usePublicFits = (limit = 20) => {
  return useQuery({
    queryKey: ['public-fits', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fits')
        .select(`
          *,
          users:user_id (
            id,
            username,
            name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
};

// Save a new fit
export const useSaveFit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fitData: {
      title?: string;
      canvas_json: any;
      render_path?: string;
      is_public?: boolean;
      occasion?: string;
      items: Array<{
        wardrobe_item_id: string;
        z_index: number;
        transform: { x: number; y: number; scale: number; rotation: number };
      }>;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Insert fit
      const { data: fit, error: fitError } = await supabase
        .from('fits')
        .insert({
          user_id: user.id,
          title: fitData.title,
          canvas_json: fitData.canvas_json,
          render_path: fitData.render_path,
          is_public: fitData.is_public || false,
          occasion: fitData.occasion,
        })
        .select()
        .single();

      if (fitError) throw fitError;

      // Insert fit items
      if (fitData.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('fit_items')
          .insert(
            fitData.items.map(item => ({
              fit_id: fit.id,
              ...item,
            }))
          );

        if (itemsError) throw itemsError;
      }

      return fit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      toast.success('Saved to My Fits. Share with friends?');
    },
    onError: (error) => {
      console.error('Error saving fit:', error);
      toast.error('Failed to save fit');
    },
  });
};

// Delete a fit
export const useDeleteFit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      toast.success('Fit deleted');
    },
    onError: (error) => {
      console.error('Error deleting fit:', error);
      toast.error('Failed to delete fit');
    },
  });
};

// Update a fit
export const useUpdateFit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Fit> }) => {
      const { data, error } = await supabase
        .from('fits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      toast.success('Fit updated');
    },
    onError: (error) => {
      console.error('Error updating fit:', error);
      toast.error('Failed to update fit');
    },
  });
};
