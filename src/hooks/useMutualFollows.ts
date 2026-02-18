import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFollows } from '@/hooks/useFollows';

export function useMutualFollows() {
  const { user } = useAuth();
  const { following } = useFollows();

  const { data: mutualFollowIds = [], isLoading } = useQuery({
    queryKey: ['mutual-follows', user?.id, following],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id || following.length === 0) return [];

      // Find who among the people I follow also follows me back
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .in('follower_id', following);

      if (error) throw error;
      return (data || []).map(f => f.follower_id);
    },
    enabled: !!user?.id && following.length > 0,
  });

  const isMutualFollow = (userId: string) => mutualFollowIds.includes(userId);

  return { mutualFollowIds, isMutualFollow, isLoading };
}
