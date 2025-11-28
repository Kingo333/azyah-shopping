import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  friends_since: string;
  public_items_count?: number;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  requester?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// Get accepted friends with their profile data
export const useFriends = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get friend IDs from v_my_friends view
      const { data: friendIds, error: friendError } = await supabase
        .from('v_my_friends')
        .select('friend_id, friends_since');

      if (friendError) throw friendError;
      if (!friendIds || friendIds.length === 0) return [];

      // Get profile data for friends
      const { data: profiles, error: profileError } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', friendIds.map(f => f.friend_id));

      if (profileError) throw profileError;

      // Get public items count for each friend
      const { data: itemCounts, error: countError } = await supabase
        .from('wardrobe_items')
        .select('user_id')
        .in('user_id', friendIds.map(f => f.friend_id))
        .eq('public_reuse_permitted', true);

      if (countError) throw countError;

      // Combine data
      const countMap = itemCounts?.reduce((acc, item) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return profiles?.map(profile => {
        const friendData = friendIds.find(f => f.friend_id === profile.id);
        return {
          id: profile.id,
          username: profile.username || 'Anonymous',
          avatar_url: profile.avatar_url,
          friends_since: friendData?.friends_since || '',
          public_items_count: countMap[profile.id] || 0,
        } as Friend;
      }) || [];
    },
    enabled: !!user,
  });
};

  // Get pending friend requests (incoming)
export const usePendingFriendRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get pending friendship records
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status, created_at')
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (friendshipsError) throw friendshipsError;
      if (!friendships || friendships.length === 0) return [];

      // Get requester profile data
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', friendships.map(f => f.user_id));

      if (profilesError) throw profilesError;

      // Combine data
      return friendships.map(friendship => ({
        id: friendship.id,
        user_id: friendship.user_id,
        friend_id: friendship.friend_id,
        status: friendship.status,
        created_at: friendship.created_at,
        requester: profiles?.find(p => p.id === friendship.user_id) || null,
      })) as FriendRequest[];
    },
    enabled: !!user,
  });
};

// Send friend request
export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .single();

      if (existing) {
        if (existing.status === 'accepted') {
          throw new Error('Already friends');
        } else if (existing.status === 'pending') {
          throw new Error('Friend request already sent');
        }
      }

      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend request sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send friend request');
    },
  });
};

// Respond to friend request (accept/reject)
export const useRespondFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast.success(variables.accept ? 'Friend request accepted' : 'Friend request rejected');
    },
    onError: () => {
      toast.error('Failed to respond to friend request');
    },
  });
};

// Remove friend
export const useRemoveFriend = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend removed');
    },
    onError: () => {
      toast.error('Failed to remove friend');
    },
  });
};

// Check if friendship exists
export const useCheckFriendship = (friendId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friendship-status', user?.id, friendId],
    queryFn: async () => {
      if (!user || !friendId) return null;

      const { data, error } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (error) throw error;
      return data?.status === 'accepted';
    },
    enabled: !!user && !!friendId,
  });
};
