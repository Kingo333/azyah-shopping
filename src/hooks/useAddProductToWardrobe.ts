import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { awardPointsAsync } from '@/hooks/useAwardPoints';
import { Product } from '@/types';
import { getProductImageUrls } from '@/utils/imageHelpers';

// Map product category to wardrobe category
const mapProductCategoryToWardrobe = (categorySlug: string | null): 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory' => {
  if (!categorySlug) return 'top';
  
  const slug = categorySlug.toLowerCase();
  
  if (slug.includes('dress') || slug.includes('gown') || slug.includes('jumpsuit')) return 'dress';
  if (slug.includes('top') || slug.includes('shirt') || slug.includes('blouse') || slug.includes('tee') || slug.includes('sweater')) return 'top';
  if (slug.includes('pant') || slug.includes('jean') || slug.includes('short') || slug.includes('skirt') || slug.includes('bottom')) return 'bottom';
  if (slug.includes('jacket') || slug.includes('coat') || slug.includes('blazer') || slug.includes('outerwear')) return 'outerwear';
  if (slug.includes('shoe') || slug.includes('sneaker') || slug.includes('boot') || slug.includes('sandal') || slug.includes('heel') || slug.includes('footwear')) return 'shoes';
  if (slug.includes('bag') || slug.includes('purse') || slug.includes('clutch') || slug.includes('tote') || slug.includes('handbag')) return 'bag';
  if (slug.includes('accessory') || slug.includes('jewelry') || slug.includes('watch') || slug.includes('belt') || slug.includes('scarf') || slug.includes('hat')) return 'accessory';
  
  return 'top'; // Default fallback
};

export const useAddProductToWardrobe = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (product: Product) => {
      if (!user) throw new Error('You must be signed in to save items');

      // Check limit before inserting
      const { data: canAdd, error: checkError } = await supabase
        .rpc('can_add_wardrobe_item', { target_user_id: user.id });

      if (checkError) throw checkError;
      
      if (!canAdd) {
        throw new Error('Wardrobe item limit reached. Upgrade to premium for unlimited items.');
      }

      // Get the primary image
      const images = getProductImageUrls(product);
      const primaryImage = images[0] || '';

      if (!primaryImage) {
        throw new Error('Product has no valid image');
      }

      // Determine brand name
      const brandName = product.brand?.name || product.merchant_name || null;

      // Map category
      const category = mapProductCategoryToWardrobe(product.category_slug);

      // Insert wardrobe item with product source info
      const { data, error } = await supabase
        .from('wardrobe_items')
        .insert({
          user_id: user.id,
          image_url: primaryImage,
          image_bg_removed_url: null, // Could trigger bg removal later
          category,
          color: null, // Could extract from product attributes later
          season: null,
          brand: brandName,
          is_favorite: false,
          tags: null,
          source: 'discover',
          public_reuse_permitted: false, // User can enable later
          attribution_user_id: null,
          thumb_path: null,
          // NEW: Product source linking fields
          source_product_id: product.id,
          source_url: product.external_url || null,
          source_vendor_name: brandName,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This item is already in your wardrobe');
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      queryClient.invalidateQueries({ queryKey: ['wardrobe-limit'] });
      toast.success('Saved to Dress Me!', {
        description: 'Item added to your wardrobe',
      });
      
      // Award points for adding wardrobe item (fire and forget)
      if (data?.id) {
        awardPointsAsync('wardrobe_add', data.id, `wardrobe:${data.id}`);
      }
    },
    onError: (error: any) => {
      console.error('Error adding product to wardrobe:', error);
      if (error.message.includes('limit reached')) {
        toast.error('Wardrobe limit reached', {
          description: 'Upgrade to premium for unlimited items',
        });
      } else if (error.message.includes('already in your wardrobe')) {
        toast.info('Already saved', {
          description: 'This item is already in your wardrobe',
        });
      } else {
        toast.error('Failed to save item', {
          description: error.message || 'Please try again',
        });
      }
    },
  });
};