import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SaveOutfitParams {
  title?: string;
  occasion?: string;
  canvas_data: any;
  is_public?: boolean;
}

export const useSaveOutfit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: SaveOutfitParams) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: params.title,
          occasion: params.occasion,
          outfit_data: params.canvas_data,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast.success('Saved to My Fits. Share with friends?');
    },
    onError: (error) => {
      console.error('Error saving outfit:', error);
      toast.error('Failed to save outfit');
    },
  });
};
