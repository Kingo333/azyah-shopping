
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Wishlist, WishlistItem } from '@/types';

export const useWishlist = (productId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wishlist, setWishlist] = useState<WishlistItem | null>(null);

  // Get user's wishlists with items
  const { data: userWishlists } = useQuery({
    queryKey: ['wishlists', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: wishlists, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get items for each wishlist
      const wishlistsWithItems = await Promise.all(
        (wishlists || []).map(async (wishlist) => {
          const { data: items } = await supabase
            .from('wishlist_items')
            .select('*')
            .eq('wishlist_id', wishlist.id);
          
          return {
            ...wishlist,
            items: items || []
          };
        })
      );

      return wishlistsWithItems as (Wishlist & { items: WishlistItem[] })[];
    },
    enabled: !!user?.id
  });

  const defaultWishlistId = userWishlists?.[0]?.id;

  // Check if product is in wishlist
  const { data: wishlistItem } = useQuery({
    queryKey: ['wishlist-item', defaultWishlistId, productId],
    queryFn: async () => {
      if (!defaultWishlistId || !productId) return null;

      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('wishlist_id', defaultWishlistId)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as WishlistItem | null;
    },
    enabled: !!defaultWishlistId && !!productId
  });

  useEffect(() => {
    setWishlist(wishlistItem || null);
  }, [wishlistItem]);

  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !productId || !defaultWishlistId) {
        throw new Error('Missing required data');
      }

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: defaultWishlistId,
          product_id: productId,
          sort_order: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setWishlist(data);
      queryClient.invalidateQueries({ queryKey: ['wishlist-item'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-products'] });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    }
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (wishlistItemId: string) => {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', wishlistItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      setWishlist(null);
      queryClient.invalidateQueries({ queryKey: ['wishlist-item'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-products'] });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    }
  });

  return {
    wishlist,
    isInWishlist: !!wishlist,
    addToWishlist: addToWishlistMutation.mutateAsync,
    removeFromWishlist: removeFromWishlistMutation.mutateAsync,
    isLoading: addToWishlistMutation.isPending || removeFromWishlistMutation.isPending,
    data: userWishlists
  };
};
