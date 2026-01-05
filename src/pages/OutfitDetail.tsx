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
import { Share2, ChevronRight } from 'lucide-react';
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
          {/* Two-column layout for desktop, stacked for mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 lg:gap-8">
            {/* Left Column - Outfit Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-secondary/30 via-background to-muted/50">
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

            {/* Right Column - Details Sidebar */}
            <div className="space-y-6">
              {/* User info with likes/comments */}
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/profile/${fit.user_id}`)}
                >
                  <Avatar className="w-12 h-12">
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
                {/* Likes/Comments next to user */}
                <div className="flex items-center gap-2">
                  <LikeButton fitId={fit.id} likeCount={fit.like_count} />
                  <CommentButton
                    commentCount={fit.comment_count}
                    onClick={() => setShowComments(true)}
                  />
                </div>
              </div>

              {/* Title */}
              {fit.title && (
                <div>
                  <h2 className="text-xl font-bold">{fit.title}</h2>
                </div>
              )}

              {/* Clothes in outfit - Now in sidebar */}
              {fit.items && fit.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Clothes in outfit</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {fit.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/community/item/${item.id}`)}
                      >
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-1 group-hover:ring-2 ring-primary transition-all">
                          <img
                            src={item.image_bg_removed_url || item.image_url}
                            alt={item.name || 'Item'}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-xs text-center line-clamp-1">
                          {item.name || item.brand || 'Untitled'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Use This Outfit Button */}
              <Button onClick={handleUseOutfit} className="w-full">
                Use This Outfit
              </Button>
            </div>
          </div>

          {/* Other Outfits by This User - Full width below */}
          {otherOutfits && otherOutfits.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">More by {username}</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/profile/${fit.user_id}`)}
                  className="text-primary"
                >
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {otherOutfits.map((outfit) => (
                  <Card
                    key={outfit.id}
                    className="flex-shrink-0 w-28 sm:w-32 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
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
        </div>

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
