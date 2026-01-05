import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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

// Hook to check if product already exists in closet
export const useCheckClosetDuplicate = (productId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['closet-duplicate-check', productId, user?.id],
    queryFn: async () => {
      if (!user || !productId) return null;
      
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('source_product_id', productId)
        .maybeSingle();
      
      if (error) {
        console.error('[Closet] Duplicate check error:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user && !!productId,
    staleTime: 1000 * 60, // 1 minute
  });
};

// Function to check duplicate before adding (for manual checks)
export const checkClosetDuplicate = async (userId: string, productId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('id')
    .eq('user_id', userId)
    .eq('source_product_id', productId)
    .maybeSingle();
  
  if (error) {
    console.error('[Closet] Duplicate check error:', error);
    return false;
  }
  
  return !!data;
};

export const useAddProductToWardrobe = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ product, skipDuplicateCheck = false }: { product: Product; skipDuplicateCheck?: boolean }) => {
      console.log('[Closet] mutationFn called with product:', product?.id);
      
      if (!user) {
        console.log('[Closet] No user, throwing error');
        throw new Error('You must be signed in to save items');
      }

      // Check for duplicates unless skipped
      if (!skipDuplicateCheck && product.id) {
        const isDuplicate = await checkClosetDuplicate(user.id, product.id);
        if (isDuplicate) {
          throw new Error('DUPLICATE_ITEM');
        }
      }

      // Check limit before inserting
      console.log('[Closet] Checking wardrobe limit for user:', user.id);
      const { data: canAdd, error: checkError } = await supabase
        .rpc('can_add_wardrobe_item', { target_user_id: user.id });

      if (checkError) {
        console.error('[Closet] Limit check error:', checkError);
        throw checkError;
      }
      
      if (!canAdd) {
        console.log('[Closet] Limit reached');
        throw new Error('Wardrobe item limit reached. Upgrade to premium for unlimited items.');
      }

      // Get the primary image
      const images = getProductImageUrls(product);
      const primaryImage = images[0] || '';
      console.log('[Closet] Images found:', images.length, 'Primary:', primaryImage?.substring(0, 50));

      if (!primaryImage) {
        console.log('[Closet] No valid image found');
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
          image_bg_removed_url: null,
          category,
          color: null,
          season: null,
          brand: brandName,
          is_favorite: false,
          tags: null,
          source: 'discover',
          public_reuse_permitted: false,
          attribution_user_id: null,
          thumb_path: null,
          source_product_id: product.id,
          source_url: product.external_url || null,
          source_vendor_name: brandName,
        })
        .select()
        .single();

      if (error) {
        console.error('[Closet] Insert error:', error);
        if (error.code === '23505') {
          throw new Error('This item is already in your Closet');
        }
        throw error;
      }
      
      console.log('[Closet] Success! Inserted wardrobe item:', data?.id);
      return data;
    },
    onSuccess: async (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      queryClient.invalidateQueries({ queryKey: ['wardrobe-limit'] });
      queryClient.invalidateQueries({ queryKey: ['closet-duplicate-check'] });
      
      // Show toast IMMEDIATELY (before awaiting points)
      const toastId = toast.success('Added to Closet ✅', {
        description: 'Item saved to your closet',
        duration: 2500,
      });
      
      // Award points in background, then update toast with points
      if (data?.id) {
        try {
          const pointsAwarded = await awardPointsAsync('wardrobe_add', data.id, `wardrobe:${data.id}`, false);
          if (pointsAwarded) {
            // Update toast to show points (dismiss old, show new combined message)
            toast.dismiss(toastId);
            toast.success(`Added to Closet +${pointsAwarded} points ✅`, {
              description: 'Item saved to your closet',
              duration: 2500,
            });
          }
        } catch (e) {
          // Points failed but item was added - toast already shown
          console.error('[Closet] Points award failed:', e);
        }
      }
    },
    onError: (error: any) => {
      console.error('Error adding product to closet:', error);
      // Don't show toast for DUPLICATE_ITEM - handled by component
      if (error.message === 'DUPLICATE_ITEM') {
        return;
      }
      if (error.message.includes('limit reached')) {
        toast.error('Closet limit reached', {
          description: 'Upgrade to premium for unlimited items',
        });
      } else if (error.message.includes('already in your Closet')) {
        toast.info('Already saved', {
          description: 'This item is already in your Closet',
        });
      } else {
        toast.error('Failed to save item', {
          description: error.message || 'Please try again',
        });
      }
    },
  });
};