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
import { Card, CardContent } from '@/components/ui/card';
import { Share2 } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { nativeShare, getShareableUrl } from '@/lib/nativeShare';
import { SmartImage } from '@/components/SmartImage';

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

  // Fetch other outfits by the same user
  const { data: otherOutfits } = useQuery({
    queryKey: ['other-outfits', fit?.user_id, id],
    queryFn: async () => {
      if (!fit?.user_id) return [];
      
      const { data, error } = await supabase
        .from('fits')
        .select('id, title, render_path, image_preview')
        .eq('user_id', fit.user_id)
        .eq('is_public', true)
        .neq('id', id!) // Exclude current outfit
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!fit?.user_id && !!id,
  });

  const handleShare = async () => {
    const shareUrl = getShareableUrl('outfit', id!);
    await nativeShare({
      title: fit?.title || 'Check out this outfit on Azyah Style',
      text: `${fit?.user?.username || 'Someone'} shared an outfit with you!`,
      url: shareUrl,
      dialogTitle: 'Share Outfit',
    });
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
              {fit.title && (
                <span className="text-muted-foreground ml-2 hidden sm:inline">
                  — {fit.title}
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="container max-w-screen-xl mx-auto px-4 py-6">
          {/* Mobile: stacked layout, Desktop: two-column */}
          <div className="flex flex-col md:grid md:grid-cols-[1fr,320px] lg:grid-cols-[1fr,360px] gap-4 md:gap-6">
            {/* Outfit Image - larger on mobile */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-secondary/30 via-background to-muted/50">
              <div className="aspect-[3/4] flex items-center justify-center p-3 sm:p-4">
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

            {/* Details Sidebar */}
            <div className="space-y-4 md:space-y-5">
              {/* User info with likes/comments */}
              <div className="space-y-2">
                <div 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => navigate(`/profile/${fit.user_id}`)}
                >
                  <Avatar className="w-8 h-8 sm:w-10 sm:w-10 md:w-12 md:h-12">
                    <AvatarImage src={fit.user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs sm:text-sm">
                      {username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs sm:text-sm truncate">{username}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(fit.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {/* Likes/Comments below user on mobile, inline on larger */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <LikeButton fitId={fit.id} likeCount={fit.like_count} size="sm" />
                  <CommentButton
                    commentCount={fit.comment_count}
                    onClick={() => setShowComments(true)}
                    size="sm"
                  />
                </div>
              </div>

              {/* Title */}
              {fit.title && (
                <div>
                  <h2 className="text-sm sm:text-base md:text-xl font-bold line-clamp-2">{fit.title}</h2>
                </div>
              )}

              {/* Clothes in outfit - vertical stack on all sizes */}
              {fit.items && fit.items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm mb-2">Clothes in outfit</h3>
                  <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto scrollbar-hide">
                    {fit.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => navigate(`/community/item/${item.id}`)}
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0 bg-muted rounded-lg overflow-hidden group-hover:ring-2 ring-primary transition-all">
                          <img
                            src={item.image_bg_removed_url || item.image_url}
                            alt={item.name || 'Item'}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-[10px] sm:text-xs line-clamp-2 flex-1">
                          {item.name || item.brand || 'Untitled'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Use This Outfit Button - hidden on mobile (shown in bottom bar) */}
              <Button onClick={handleUseOutfit} className="w-full hidden sm:flex" size="sm">
                Use This Outfit
              </Button>
            </div>
          </div>

        </div>

        {/* Other Outfits by This User - Full width, pushed lower */}
        {otherOutfits && otherOutfits.length > 0 && (
          <div className="mt-8 sm:mt-10 pt-6 border-t">
            <h3 className="font-semibold text-base sm:text-lg mb-4">More by {username}</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {otherOutfits.map((outfit) => (
                <Card
                  key={outfit.id}
                  className="flex-shrink-0 w-28 sm:w-32 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden snap-start"
                  onClick={() => navigate(`/dress-me/outfit/${outfit.id}`)}
                >
                  <div className="aspect-[3/4] bg-muted overflow-hidden">
                    <SmartImage
                      src={outfit.render_path || outfit.image_preview || '/placeholder.svg'}
                      alt={outfit.title || 'Outfit'}
                      className="w-full h-full object-cover"
                      sizes="128px"
                    />
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs line-clamp-1 font-medium">
                      {outfit.title || 'Untitled'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Fixed bottom actions - simplified on mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 lg:hidden">
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
