import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SaveFitParams {
  title?: string;
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

      // Call render-fit edge function with base64 image if provided
      const { data: renderData, error: renderError } = await supabase.functions.invoke('render-fit', {
        body: { 
          canvas_json: params.canvas_json,
          canvas_image_base64: params.canvas_image_base64
        }
      });

      if (renderError) throw renderError;

      // Insert fit record
      const { data: fit, error: fitError } = await supabase
        .from('fits')
        .insert({
          user_id: user.id,
          title: params.title,
          canvas_json: params.canvas_json,
          render_path: renderData?.render_path || 'placeholder.png',
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
