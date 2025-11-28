import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LikeButton } from '@/components/LikeButton';
import { CommentButton } from '@/components/CommentButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useSendFriendRequest, useCheckFriendship } from '@/hooks/useFriends';
import { UserPlus, Check } from 'lucide-react';

interface PublicFit {
  id: string;
  title: string | null;
  render_path: string | null;
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

export const CommunityOutfits = () => {
  const navigate = useNavigate();

  const { data: fits, isLoading } = useQuery({
    queryKey: ['community-outfits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fits')
        .select(`
          id,
          title,
          render_path,
          like_count,
          comment_count,
          created_at,
          user_id
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user data separately
      const fitsWithUsers = await Promise.all(
        (data || []).map(async (fit) => {
          const { data: userData } = await supabase
            .from('users')
            .select('id, username, name, avatar_url')
            .eq('id', fit.user_id)
            .single();
          
          return {
            ...fit,
            user: userData || { id: fit.user_id, username: null, name: null, avatar_url: null },
          };
        })
      );
      
      return fitsWithUsers as PublicFit[];
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
            {fit.render_path ? (
              <img
                src={fit.render_path}
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
                  {(fit.user.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {fit.user.username || 'Anonymous'}
              </span>
              <AddFriendButton userId={fit.user.id} />
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
