import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FitComment {
  id: string;
  fit_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  };
}

export const useFitComments = (fitId: string) => {
  return useQuery({
    queryKey: ['fit-comments', fitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fit_comments')
        .select(`
          id,
          fit_id,
          user_id,
          comment_text,
          created_at
        `)
        .eq('fit_id', fitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user data separately (using public_profiles table)
      const commentsWithUsers = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: userData } = await supabase
            .from('public_profiles')
            .select('id, username, name, avatar_url')
            .eq('id', comment.user_id)
            .single();
          
          return {
            ...comment,
            user: userData || { id: comment.user_id, username: null, name: null, avatar_url: null },
          };
        })
      );
      
      return commentsWithUsers as FitComment[];
    },
    enabled: !!fitId,
  });
};

export const useAddComment = (fitId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('fit_comments')
        .insert({
          fit_id: fitId,
          user_id: user.id,
          comment_text: commentText,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Fetch user data (using public_profiles table)
      const { data: userData } = await supabase
        .from('public_profiles')
        .select('id, username, name, avatar_url')
        .eq('id', user.id)
        .single();
      
      return {
        ...data,
        user: userData || { id: user.id, username: null, name: null, avatar_url: null },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fit-comments', fitId] });
      queryClient.invalidateQueries({ queryKey: ['public-fits'] });
      toast.success('Comment added');
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    },
  });
};

export const useDeleteComment = (fitId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('fit_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fit-comments', fitId] });
      queryClient.invalidateQueries({ queryKey: ['public-fits'] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    },
  });
};
