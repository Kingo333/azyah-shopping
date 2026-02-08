import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';

/**
 * Unified hook for product likes.
 * Canonical source of truth: `likes` table.
 * Also writes to `swipes` table for ML training data consistency.
 */
export function useProductLikes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all liked product IDs from the canonical `likes` table
  const { data: likedIdsArray } = useQuery({
    queryKey: ['product-likes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('likes')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map(d => d.product_id).filter(Boolean) as string[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });

  const likedIds = useMemo(() => new Set(likedIdsArray || []), [likedIdsArray]);

  const isLiked = useCallback(
    (productId: string) => likedIds.has(productId),
    [likedIds],
  );

  const invalidateLikes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['product-likes'] });
    queryClient.invalidateQueries({ queryKey: ['liked-products'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  }, [queryClient]);

  // Toggle like mutation with optimistic update + dual-write to swipes for ML
  const toggleMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const wasLiked = likedIds.has(productId);

      if (wasLiked) {
        // Unlike: remove from likes + swipes
        await Promise.all([
          supabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId),
          supabase
            .from('swipes')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .eq('action', 'right'),
        ]);
        return { productId, action: 'unliked' as const };
      } else {
        // Like: insert into likes + swipes (dual-write for ML consistency)
        const likePromise = supabase
          .from('likes')
          .insert({ user_id: user.id, product_id: productId })
          .then(res => {
            if (res.error?.code === '23505') {
              // Already exists, bump to top
              return supabase
                .from('likes')
                .update({ created_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('product_id', productId);
            }
            if (res.error) throw res.error;
            return res;
          });

        const swipePromise = supabase
          .from('swipes')
          .insert({
            user_id: user.id,
            product_id: productId,
            action: 'right' as const,
          })
          .then(res => {
            // Ignore duplicate swipe errors
            if (res.error?.code === '23505') return res;
            if (res.error) throw res.error;
            return res;
          });

        await Promise.all([likePromise, swipePromise]);
        return { productId, action: 'liked' as const };
      }
    },
    // Optimistic update
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: ['product-likes', user?.id] });
      const previous = queryClient.getQueryData<string[]>(['product-likes', user?.id]);

      queryClient.setQueryData<string[]>(['product-likes', user?.id], old => {
        const current = old || [];
        if (current.includes(productId)) {
          return current.filter(id => id !== productId);
        }
        return [...current, productId];
      });

      return { previous };
    },
    onError: (_err, _productId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['product-likes', user?.id], context.previous);
      }
    },
    onSettled: () => {
      invalidateLikes();
    },
  });

  const toggleLike = useCallback(
    (productId: string) => toggleMutation.mutate(productId),
    [toggleMutation],
  );

  return {
    likedIds,
    isLiked,
    toggleLike,
    isToggling: toggleMutation.isPending,
  };
}
