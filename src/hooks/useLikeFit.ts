import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useIsLiked = (fitId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-liked', fitId, user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', fitId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    },
    enabled: !!user && !!fitId,
  });
};

export const useToggleLike = (fitId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Check if already liked
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', fitId)
        .single();

      if (existing) {
        // Unlike
        await supabase.from('likes').delete().eq('id', existing.id);
        
        // Decrement like count
        const { data: fit } = await supabase
          .from('fits')
          .select('like_count')
          .eq('id', fitId)
          .single();
        
        if (fit) {
          await supabase
            .from('fits')
            .update({ like_count: Math.max(0, fit.like_count - 1) })
            .eq('id', fitId);
        }
        
        return false;
      } else {
        // Like
        await supabase.from('likes').insert({ user_id: user.id, product_id: fitId });
        
        // Increment like count
        const { data: fit } = await supabase
          .from('fits')
          .select('like_count')
          .eq('id', fitId)
          .single();
        
        if (fit) {
          await supabase
            .from('fits')
            .update({ like_count: fit.like_count + 1 })
            .eq('id', fitId);
        }
        
        return true;
      }
    },
    onSuccess: (isLiked) => {
      queryClient.invalidateQueries({ queryKey: ['is-liked', fitId] });
      queryClient.invalidateQueries({ queryKey: ['public-fits'] });
      queryClient.invalidateQueries({ queryKey: ['fit', fitId] });
    },
    onError: (error) => {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    },
  });
};
