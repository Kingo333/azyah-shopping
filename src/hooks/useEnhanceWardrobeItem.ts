import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trimTransparentPadding, dataUrlToFile } from '@/utils/imageTrimming';
import { toast } from 'sonner';

export const useEnhanceWardrobeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      // Step 1: Call edge function to enhance
      const { data, error } = await supabase.functions.invoke('enhance-wardrobe-item', {
        body: { item_id: itemId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const enhancedUrl = data.image_url;
      console.log('Enhancement complete, trimming padding...', enhancedUrl);

      // Step 2: Download enhanced image
      const response = await fetch(enhancedUrl);
      const blob = await response.blob();
      const enhancedFile = new File([blob], 'enhanced.png', { type: 'image/png' });

      // Step 3: Trim transparent padding
      const trimResult = await trimTransparentPadding(enhancedFile, 5);
      console.log('Trim result:', {
        original: trimResult.originalSize,
        trimmed: trimResult.trimmedSize,
        offset: trimResult.offset,
      });

      // Step 4: Convert to file and upload trimmed version
      const trimmedFile = dataUrlToFile(trimResult.dataUrl, `${itemId}_trimmed.png`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${crypto.randomUUID()}_trimmed.png`;
      const { error: uploadError } = await supabase.storage
        .from('wardrobe-items')
        .upload(fileName, trimmedFile, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wardrobe-items')
        .getPublicUrl(fileName);

      // Step 5: Update database with trimmed URL and metadata
      const { error: updateError } = await supabase
        .from('wardrobe_items')
        .update({
          image_bg_removed_url: publicUrl,
          trim_offset_x: trimResult.offset.x,
          trim_offset_y: trimResult.offset.y,
          original_width: trimResult.originalSize.w,
          original_height: trimResult.originalSize.h,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      console.log('Enhancement and trimming complete');
      return { image_url: publicUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      toast.success('Item enhanced and trimmed successfully');
    },
    onError: (error) => {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance item');
    },
  });
};
