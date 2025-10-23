import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SaveFitParams {
  title?: string;
  occasion?: string;
  canvas_json: any;
  canvas_image_base64?: string;
  is_public: boolean;
  items: Array<{ 
    wardrobe_item_id: string; 
    transform: any; 
    z_index: number;
  }>;
}

export const useSaveFit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveFitParams) => {
      if (!user) throw new Error('Not authenticated');

      // Insert fit record with base64 image preview
      const { data: fit, error: fitError } = await supabase
        .from('fits')
        .insert({
          user_id: user.id,
          title: params.title,
          occasion: params.occasion,
          canvas_json: params.canvas_json,
          image_preview: params.canvas_image_base64,
          render_path: null,
          is_public: params.is_public,
        })
        .select()
        .single();

      if (fitError) throw fitError;

      // Insert fit items
      if (params.items.length > 0) {
        const fitItems = params.items.map(item => ({
          fit_id: fit.id,
          wardrobe_item_id: item.wardrobe_item_id,
          z_index: item.z_index,
          transform: item.transform,
        }));

        const { error: itemsError } = await supabase
          .from('fit_items')
          .insert(fitItems);

        if (itemsError) throw itemsError;
      }

      return fit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fits'] });
      queryClient.invalidateQueries({ queryKey: ['public-fits'] });
    },
    onError: (error) => {
      console.error('Error saving fit:', error);
      toast.error('Failed to save fit');
    },
  });
};
