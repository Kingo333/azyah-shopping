
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Wishlist, WishlistItem } from '@/types';

export const useWishlist = (productId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wishlist, setWishlist] = useState<WishlistItem | null>(null);

  // Create default wishlist mutation
  const createDefaultWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          title: 'My Wishlist',
          description: 'My default wishlist'
        })
        .select()
        .single();

      if (error) throw error;
      return data as Wishlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    }
  });

  // Get user's wishlists with auto-creation
  const { data: userWishlists, isLoading: wishlistsLoading } = useQuery({
    queryKey: ['wishlists', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Auto-create default wishlist if none exists
      if (!data || data.length === 0) {
        const newWishlist = await createDefaultWishlistMutation.mutateAsync();
        return [newWishlist];
      }
      
      return data as Wishlist[];
    },
    enabled: !!user?.id,
    retry: 1
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
    mutationFn: async (targetProductId?: string) => {
      const actualProductId = targetProductId || productId;
      
      if (!user?.id) {
        throw new Error('Please log in to add items to your wishlist');
      }
      
      if (!actualProductId) {
        throw new Error('Invalid product selected');
      }

      // Ensure we have a wishlist
      let wishlistId = defaultWishlistId;
      if (!wishlistId) {
        const newWishlist = await createDefaultWishlistMutation.mutateAsync();
        wishlistId = newWishlist.id;
      }

      // Check if item already exists to provide better error message
      const { data: existingItem } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('wishlist_id', wishlistId)
        .eq('product_id', actualProductId)
        .single();

      if (existingItem) {
        throw new Error('Item is already in your wishlist');
      }

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlistId,
          product_id: actualProductId,
          sort_order: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Wishlist error details:', error);
        if (error.code === '23505') {
          throw new Error('Item is already in your wishlist');
        }
        throw new Error(`Failed to add to wishlist: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      setWishlist(data);
      queryClient.invalidateQueries({ queryKey: ['wishlist-item'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-products'] });
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
    }
  });

  return {
    wishlist,
    isInWishlist: !!wishlist,
    addToWishlist: addToWishlistMutation.mutateAsync,
    removeFromWishlist: removeFromWishlistMutation.mutateAsync,
    isLoading: addToWishlistMutation.isPending || removeFromWishlistMutation.isPending || wishlistsLoading,
    hasWishlist: !!defaultWishlistId
  };
};
