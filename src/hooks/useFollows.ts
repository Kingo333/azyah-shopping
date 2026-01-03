import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useFollows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users the current user is following
  const { data: following, isLoading: followingLoading } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;
      return data.map(f => f.following_id);
    },
    enabled: !!user?.id,
  });

  // Follow a user
  const followMutation = useMutation({
    mutationFn: async (followingId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: followingId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      toast({
        title: 'Following',
        description: 'You are now following this user.',
      });
    },
    onError: (error: any) => {
      // Handle duplicate follows gracefully
      if (error.code === '23505') {
        toast({
          title: 'Already following',
          description: 'You are already following this user.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not follow user. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  // Unfollow a user
  const unfollowMutation = useMutation({
    mutationFn: async (followingId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      toast({
        title: 'Unfollowed',
        description: 'You have unfollowed this user.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not unfollow user. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const isFollowing = (userId: string) => {
    return following?.includes(userId) ?? false;
  };

  const toggleFollow = (userId: string) => {
    if (isFollowing(userId)) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate(userId);
    }
  };

  return {
    following: following ?? [],
    followingLoading,
    isFollowing,
    toggleFollow,
    followUser: followMutation.mutate,
    unfollowUser: unfollowMutation.mutate,
    isToggling: followMutation.isPending || unfollowMutation.isPending,
  };
}
