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
  gifted_to?: string;
  context?: 'self' | 'friend' | 'suggestion';
  items: Array<{ 
    wardrobe_item_id: string; 
    transform: any; 
    z_index: number;
  }>;
}

// Helper to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

export const useSaveFit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveFitParams) => {
      if (!user) throw new Error('Not authenticated');

      // Generate fit ID early
      const fitId = crypto.randomUUID();
      let imageUrl: string | null = null;

      // Upload JPEG to storage if base64 provided
      if (params.canvas_image_base64) {
        console.log('📤 Uploading outfit image to storage...');
        
        // Validate base64 format
        if (!params.canvas_image_base64.startsWith('data:image')) {
          throw new Error('Invalid image format - must be base64 data URL');
        }

        const blob = base64ToBlob(params.canvas_image_base64, 'image/jpeg');
        
        // Validate blob size (max 5MB)
        const sizeInMB = blob.size / (1024 * 1024);
        console.log(`📦 Image blob size: ${Math.round(sizeInMB * 100) / 100}MB`);
        
        if (sizeInMB > 5) {
          throw new Error(`Image too large: ${Math.round(sizeInMB)}MB (max 5MB)`);
        }

        const filePath = `${user.id}/${fitId}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('saved-outfits')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('✅ Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('saved-outfits')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        console.log('🔗 Public URL:', imageUrl);
      }

      // Insert fit record with storage URL
      const { data: fit, error: fitError } = await supabase
        .from('fits')
        .insert({
          id: fitId,
          user_id: user.id,
          title: params.title,
          occasion: params.occasion,
          canvas_json: params.canvas_json,
          image_preview: imageUrl,
          is_public: params.is_public,
          gifted_to: params.gifted_to || null,
          context: params.context || 'self',
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
