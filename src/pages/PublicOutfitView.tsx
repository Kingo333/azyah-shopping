import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SEOHead } from '@/components/SEOHead';
import { Share2, ExternalLink, Heart, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { nativeShare, getShareableUrl } from '@/lib/nativeShare';

interface OutfitItem {
  id: string;
  image_url: string;
  image_bg_removed_url: string | null;
  brand: string | null;
  category: string;
  source_product_id: string | null;
  source_url: string | null;
  source_vendor_name: string | null;
}

interface PublicOutfit {
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
  items: OutfitItem[];
}

export default function PublicOutfitView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: outfit, isLoading, error } = useQuery({
    queryKey: ['public-outfit', id],
    queryFn: async (): Promise<PublicOutfit | null> => {
      if (!id) return null;

      // Fetch outfit (ONLY public)
      const { data: fitData, error: fitError } = await supabase
        .from('fits')
        .select('id, title, render_path, image_preview, like_count, comment_count, created_at, user_id')
        .eq('id', id)
        .eq('is_public', true) // CRITICAL: Only public outfits
        .single();

      if (fitError || !fitData) {
        return null;
      }

      // Fetch user info (using public_profiles table)
      const { data: userData } = await supabase
        .from('public_profiles')
        .select('id, username, name, avatar_url')
        .eq('id', fitData.user_id)
        .single();

      // Fetch fit items
      const { data: fitItems } = await supabase
        .from('fit_items')
        .select('wardrobe_item_id')
        .eq('fit_id', id);

      // Fetch wardrobe items
      const wardrobeItemIds = (fitItems || []).map(item => item.wardrobe_item_id);
      let wardrobeItems: OutfitItem[] = [];

      if (wardrobeItemIds.length > 0) {
        const { data: items } = await supabase
          .from('wardrobe_items')
          .select('id, image_url, image_bg_removed_url, brand, category, source_product_id, source_url, source_vendor_name')
          .in('id', wardrobeItemIds);
        
        wardrobeItems = (items || []) as OutfitItem[];
      }

      return {
        ...fitData,
        user: userData || { id: fitData.user_id, username: null, name: null, avatar_url: null },
        items: wardrobeItems,
      };
    },
    enabled: !!id,
  });

  const handleShare = async () => {
    const shareUrl = getShareableUrl('outfit', id!);
    await nativeShare({
      title: outfit?.title || 'Check out this outfit on Azyah Style',
      text: `${outfit?.user?.username || 'Someone'} shared an outfit with you!`,
      url: shareUrl,
      dialogTitle: 'Share Outfit',
    });
  };

  const handleItemClick = (item: OutfitItem) => {
    navigate(`/share/item/${item.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!outfit || error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <SEOHead 
          title="Outfit Not Available - Azyah"
          description="This outfit is not available or has been made private."
        />
        <h1 className="text-xl font-semibold mb-2">Outfit Not Available</h1>
        <p className="text-muted-foreground text-center mb-6">
          This outfit doesn't exist or is private.
        </p>
        <Button onClick={() => navigate('/community')}>
          Explore Community
        </Button>
      </div>
    );
  }

  const username = outfit.user.username || outfit.user.name || 'Anonymous';
  const outfitImage = outfit.render_path || outfit.image_preview;

  return (
    <>
      <SEOHead
        title={`${outfit.title || 'Outfit'} by ${username} - Azyah`}
        description={`Check out this outfit created by ${username} on Azyah`}
        image={outfitImage || undefined}
        canonical={`https://azyahstyle.com/share/outfit/${id}`}
        url={`https://azyahstyle.com/share/outfit/${id}`}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header 
          className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
          style={{ paddingTop: 'var(--safe-top, 0px)' }}
        >
          <div className="container flex items-center justify-between h-14 max-w-screen-2xl px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">Outfit</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="container max-w-screen-md mx-auto px-4 py-6 pb-24">
          {/* Main outfit image */}
          <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg bg-gradient-to-br from-secondary/30 via-background to-muted/50">
            <div className="aspect-[3/4] flex items-center justify-center p-4">
              {outfitImage ? (
                <img
                  src={outfitImage}
                  alt={outfit.title || 'Outfit'}
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
              <AvatarImage src={outfit.user.avatar_url || undefined} />
              <AvatarFallback>
                {username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{username}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(outfit.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Title */}
          {outfit.title && (
            <h2 className="text-xl font-bold mb-4">{outfit.title}</h2>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{outfit.like_count}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {outfit.comment_count} {outfit.comment_count === 1 ? 'comment' : 'comments'}
            </span>
          </div>

          {/* Items in outfit */}
          {outfit.items && outfit.items.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Items in this outfit</h3>
              <div className="grid grid-cols-3 gap-3">
                {outfit.items.map((item) => (
                  <div
                    key={item.id}
                    className="cursor-pointer group"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2 relative">
                      <img
                        src={item.image_bg_removed_url || item.image_url}
                        alt={item.brand || 'Item'}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      {item.source_url && (
                        <div className="absolute top-1 right-1 bg-background/80 rounded-full p-1">
                          <ExternalLink className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center line-clamp-1">
                      {item.brand || item.category}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 p-4 bg-muted/50 rounded-xl text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to create outfits like this?
            </p>
            <Button onClick={() => navigate('/onboarding/signup')}>
              Join Azyah
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}