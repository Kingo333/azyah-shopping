import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WishlistProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_urls: any;
  brand_id: string;
  status: string;
}

interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  added_at: string;
  product: WishlistProduct;
}

export const useWishlistProducts = () => {
  const { user } = useAuth();

  // First fetch user's wishlists
  const { data: wishlists } = useQuery({
    queryKey: ['wishlists', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('wishlists')
        .select('id, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Then fetch products from the first/default wishlist
  const defaultWishlistId = wishlists?.[0]?.id;

  const { data: wishlistProducts, isLoading, error } = useQuery({
    queryKey: ['wishlist-products', defaultWishlistId],
    queryFn: async () => {
      if (!defaultWishlistId) return [];

      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          wishlist_id,
          product_id,
          added_at,
          products!wishlist_items_product_fkey(
            id,
            title,
            price_cents,
            currency,
            media_urls,
            brand_id,
            status
          )
        `)
        .eq('wishlist_id', defaultWishlistId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data?.map(item => ({
        id: item.id,
        wishlist_id: item.wishlist_id,
        product_id: item.product_id,
        added_at: item.added_at,
        product: item.products
      })) as WishlistItem[]) || [];
    },
    enabled: !!defaultWishlistId
  });

  return {
    wishlistProducts: wishlistProducts || [],
    isLoading,
    error,
    hasWishlist: !!defaultWishlistId
  };
};