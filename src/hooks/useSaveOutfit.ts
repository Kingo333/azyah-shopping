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
        .from('fits')
        .insert({
          user_id: user.id,
          title: params.title,
          occasion: params.occasion,
          canvas_json: params.canvas_data,
          is_public: params.is_public || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      toast.success('Saved to My Fits. Share with friends?');
    },
    onError: (error) => {
      console.error('Error saving outfit:', error);
      toast.error('Failed to save outfit');
    },
  });
};
