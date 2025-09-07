import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductOutfitAsset {
  id: string;
  product_id: string;
  brand_id: string;
  outfit_image_url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useProductOutfits = (brandId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get outfit assets for a brand
  const {
    data: outfitAssets,
    isLoading,
    error
  } = useQuery({
    queryKey: ['product-outfits', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      
      const { data, error } = await supabase
        .from('product_outfit_assets')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProductOutfitAsset[];
    },
    enabled: !!brandId
  });

  // Upload outfit asset for a product
  const uploadOutfitMutation = useMutation({
    mutationFn: async ({ productId, brandId, file }: {
      productId: string;
      brandId: string;
      file: File;
    }) => {
      // Upload image to storage
      const fileName = `${productId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-outfits')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-outfits')
        .getPublicUrl(fileName);

      // Save to database
      const { data, error } = await supabase
        .from('product_outfit_assets')
        .upsert({
          product_id: productId,
          brand_id: brandId,
          outfit_image_url: urlData.publicUrl,
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-outfits'] });
      toast({
        title: "Success",
        description: "Outfit uploaded successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload outfit",
        variant: "destructive"
      });
    }
  });

  // Delete outfit asset
  const deleteOutfitMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('product_outfit_assets')
        .delete()
        .eq('product_id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-outfits'] });
      toast({
        title: "Success",
        description: "Outfit removed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to remove outfit",
        variant: "destructive"
      });
    }
  });

  return {
    outfitAssets: outfitAssets || [],
    isLoading,
    error,
    uploadOutfit: uploadOutfitMutation.mutate,
    deleteOutfit: deleteOutfitMutation.mutate,
    isUploading: uploadOutfitMutation.isPending,
    isDeleting: deleteOutfitMutation.isPending,
    remainingSlots: Math.max(0, 5 - (outfitAssets?.length || 0))
  };
};

// Hook to check if a product has an outfit
export const useProductHasOutfit = (productId: string) => {
  return useQuery({
    queryKey: ['product-has-outfit', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_outfit_assets')
        .select('id')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!productId
  });
};