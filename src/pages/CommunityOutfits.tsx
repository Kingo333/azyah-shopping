import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LikeButton } from '@/components/LikeButton';
import { CommentButton } from '@/components/CommentButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useSendFriendRequest, useCheckFriendship } from '@/hooks/useFriends';
import { useHasPublicItems } from '@/hooks/useUserPublicWardrobeItems';
import { UserPlus, Check, Palette } from 'lucide-react';
import { getDisplayName, getDisplayNameInitial } from '@/utils/userDisplayName';

interface PublicFit {
  id: string;
  title: string | null;
  render_path: string | null;
  image_preview: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  };
}

// Add Friend Button Component
const AddFriendButton = ({ userId }: { userId: string }) => {
  const { user } = useAuth();
  const sendRequest = useSendFriendRequest();
  const { data: isFriend } = useCheckFriendship(userId);
  
  if (!user || user.id === userId) return null; // Can't add yourself
  if (isFriend) return (
    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
      <Check className="w-3 h-3 text-white" />
    </div>
  );
  
  return (
    <button
      className="w-5 h-5 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        sendRequest.mutate(userId);
      }}
    >
      <UserPlus className="w-3 h-3 text-white" />
    </button>
  );
};

// Style Button Component
const StyleButton = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: hasPublicItems } = useHasPublicItems(userId);
  
  if (!user || user.id === userId || !hasPublicItems) return null;
  
  return (
    <button
      className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center hover:bg-violet-600 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/dress-me/canvas?mode=suggest&targetId=${userId}`);
      }}
      title="Style this person"
    >
      <Palette className="w-3 h-3 text-white" />
    </button>
  );
};

export const CommunityOutfits = () => {
  const navigate = useNavigate();
  const { blockedIds } = useBlockedUsers();

  const { data: fits, isLoading } = useQuery({
    queryKey: ['community-outfits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fits')
        .select(`
          id,
          title,
          render_path,
          image_preview,
          like_count,
          comment_count,
          created_at,
          user_id
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50); // Add pagination limit

      if (error) throw error;
      if (!data?.length) return [];
      
      // Batch fetch users in single query (fixes N+1)
      const userIds = [...new Set(data.map(fit => fit.user_id))];
      const { data: users } = await supabase
        .from('public_profiles')
        .select('id, username, name, avatar_url')
        .in('id', userIds);
      
      const userMap = new Map(users?.map(u => [u.id, u]) || []);
      
      return data.map(fit => ({
        ...fit,
        user: userMap.get(fit.user_id) || { 
          id: fit.user_id, username: null, name: null, avatar_url: null 
        }
      })) as PublicFit[];
    },
  });

  const handleFitClick = (fitId: string) => {
    navigate(`/community/outfit/${fitId}`);
  };

  const handleCommentClick = (e: React.MouseEvent, fitId: string) => {
    e.stopPropagation();
    navigate(`/community/outfit/${fitId}?openComments=true`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!fits || fits.length === 0) {
    return (
      <div className="community-empty-state">
        <span className="text-5xl mb-3">👔</span>
        <p className="text-lg font-medium">No public outfits yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Be the first to share an outfit!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {fits.map((fit) => (
        <div
          key={fit.id}
          className="outfit-card"
          onClick={() => handleFitClick(fit.id)}
        >
          <div className="outfit-image-frame relative">
            {(fit.render_path || fit.image_preview) ? (
              <img
                src={fit.render_path || fit.image_preview}
                alt={fit.title || 'Outfit'}
                className="outfit-image"
              />
            ) : (
              <div className="outfit-placeholder">No preview</div>
            )}

            {/* User avatar overlay */}
            <div className="outfit-user-badge">
              <Avatar className="w-5 h-5">
                <AvatarImage src={fit.user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getDisplayNameInitial(fit.user)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {getDisplayName(fit.user)}
              </span>
              <AddFriendButton userId={fit.user.id} />
              <StyleButton userId={fit.user.id} />
            </div>
          </div>

          {/* Social actions */}
          <div className="outfit-social">
            <LikeButton fitId={fit.id} likeCount={fit.like_count} size="sm" />
            <CommentButton
              commentCount={fit.comment_count}
              onClick={(e) => handleCommentClick(e, fit.id)}
              size="sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
