import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/ui/back-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LikeButton } from '@/components/LikeButton';
import { CommentButton } from '@/components/CommentButton';
import { CommentsSheet } from '@/components/CommentsSheet';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function OutfitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (searchParams.get('openComments') === 'true') {
      setShowComments(true);
    }
  }, [searchParams]);

  const { data: fit, isLoading } = useQuery({
    queryKey: ['fit', id],
    queryFn: async () => {
      if (!id) throw new Error('No fit ID provided');

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
          user_id,
          canvas_json
        `)
        .eq('id', id)
        .eq('is_public', true)
        .single();

      if (error) throw error;

      // Fetch user data
      const { data: userData } = await supabase
        .from('users_public')
        .select('id, username, name, avatar_url')
        .eq('id', data.user_id)
        .single();

      // Fetch fit items
      const { data: fitItems } = await supabase
        .from('fit_items')
        .select(`
          wardrobe_item_id,
          z_index,
          transform
        `)
        .eq('fit_id', id);

      // Fetch wardrobe items
      const wardrobeItemIds = (fitItems || []).map(item => item.wardrobe_item_id);
      let wardrobeItems: any[] = [];

      if (wardrobeItemIds.length > 0) {
        const { data: items } = await supabase
          .from('wardrobe_items')
          .select('*')
          .in('id', wardrobeItemIds);
        wardrobeItems = items || [];
      }

      return {
        ...data,
        user: userData || { id: data.user_id, username: null, name: null, avatar_url: null },
        items: wardrobeItems,
      };
    },
    enabled: !!id,
  });

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: fit?.title || 'Check out this outfit',
          url,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleUseOutfit = () => {
    if (fit) {
      sessionStorage.setItem('loadPublicFitId', fit.id);
      navigate('/dress-me/canvas');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading outfit...</p>
      </div>
    );
  }

  if (!fit) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Outfit not found</p>
        <Button onClick={() => navigate('/community')} className="mt-4">
          Back to Community
        </Button>
      </div>
    );
  }

  const username = fit.user.username || fit.user.name || 'Anonymous';

  return (
    <>
      <SEOHead
        title={`${fit.title || 'Outfit'} by ${username} - Azyah Community`}
        description={`Check out this outfit created by ${username} on Azyah`}
      />

      <div className="min-h-screen bg-background pb-24">
        <header 
          className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
          style={{ paddingTop: 'var(--safe-top, 0px)' }}
        >
          <div className="container flex items-center justify-between h-14 max-w-screen-2xl">
            <div className="flex items-center">
              <BackButton />
              <h1 className="text-lg font-semibold ml-2">Outfit</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="container max-w-screen-md mx-auto px-4 py-6">
          {/* Main outfit image */}
          <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg bg-gradient-to-br from-secondary/30 via-background to-muted/50">
            <div className="aspect-[3/4] flex items-center justify-center p-4">
              {(fit.render_path || fit.image_preview) ? (
                <img
                  src={fit.render_path || fit.image_preview}
                  alt={fit.title || 'Outfit'}
                  className="max-w-full max-h-full object-contain rounded-lg drop-shadow-md"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={fit.user.avatar_url || undefined} />
              <AvatarFallback>
                {username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{username}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(fit.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Title */}
          {fit.title && (
            <h2 className="text-xl font-bold mb-4">{fit.title}</h2>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-muted-foreground">
              {fit.like_count} {fit.like_count === 1 ? 'like' : 'likes'}
            </span>
            <span className="text-sm text-muted-foreground">
              {fit.comment_count} {fit.comment_count === 1 ? 'comment' : 'comments'}
            </span>
          </div>

          {/* Clothes in outfit */}
          {fit.items && fit.items.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Clothes in outfit</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {fit.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-24 cursor-pointer"
                    onClick={() => navigate(`/community/item/${item.id}`)}
                  >
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2">
                      <img
                        src={item.image_bg_removed_url || item.image_url}
                        alt={item.name || 'Item'}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-center line-clamp-2">
                      {item.name || item.brand || 'Untitled'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="container max-w-screen-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LikeButton fitId={fit.id} likeCount={fit.like_count} />
              <CommentButton
                commentCount={fit.comment_count}
                onClick={() => setShowComments(true)}
              />
            </div>
            <Button onClick={handleUseOutfit}>
              Use This Outfit
            </Button>
          </div>
        </div>

        <CommentsSheet
          fitId={fit.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      </div>
    </>
  );
}
