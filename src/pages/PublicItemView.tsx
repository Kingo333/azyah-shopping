import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/SEOHead';
import { ArrowLeft, ExternalLink, Share2, ShoppingBag } from 'lucide-react';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { nativeShare, getShareableUrl, getPublicBaseUrl } from '@/lib/nativeShare';

interface PublicItem {
  id: string;
  share_slug: string;
  image_url: string;
  image_bg_removed_url: string | null;
  brand: string | null;
  category: string;
  name: string | null;
  color: string | null;
  season: string | null;
  tags: string[] | null;
  source_url: string | null;
  source_vendor_name: string | null;
  created_at: string;
  creator_id: string | null;
  creator_username: string | null;
  creator_name: string | null;
  creator_avatar_url: string | null;
  outfit_id: string | null;
  outfit_title: string | null;
  outfit_slug: string | null;
}

interface CreatorOutfit {
  id: string;
  title: string | null;
  render_path: string | null;
  image_preview: string | null;
  share_slug: string;
}

export default function PublicItemView() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Fetch item by slug
  const { data: item, isLoading, error } = useQuery({
    queryKey: ['public-item-slug', slug],
    queryFn: async (): Promise<PublicItem | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .rpc('get_public_item_by_slug', { slug_param: slug });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0] as PublicItem;
    },
    enabled: !!slug,
  });

  // Fetch creator's other public outfits
  const { data: creatorOutfits } = useQuery({
    queryKey: ['creator-public-outfits-slug', item?.creator_id, item?.outfit_slug],
    queryFn: async (): Promise<CreatorOutfit[]> => {
      if (!item?.creator_id) return [];

      const { data } = await supabase
        .rpc('get_creator_public_outfits_by_slug', { 
          creator_id_param: item.creator_id,
          exclude_slug_param: item.outfit_slug || null
        });

      return (data || []) as CreatorOutfit[];
    },
    enabled: !!item?.creator_id,
  });

  const handleShare = async () => {
    if (!item?.share_slug) return;
    const shareUrl = getShareableUrl('item', item.share_slug);
    await nativeShare({
      title: `${item?.brand || 'Item'} - Azyah Style`,
      text: `Check out this ${item?.category || 'item'} on Azyah Style!`,
      url: shareUrl,
      dialogTitle: 'Share Item',
    });
  };

  const handleShopNow = () => {
    openExternalUrl(item?.source_url);
  };

  const handleOutfitClick = (outfit: CreatorOutfit) => {
    navigate(`/share/outfit/${outfit.share_slug}`);
  };

  // Helper to get display name with proper fallback
  const getCreatorDisplayName = () => {
    if (!item) return 'Azyah user';
    return item.creator_name || item.creator_username || 'Azyah user';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item || error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <SEOHead 
          title="Item Not Available - Azyah"
          description="This item is not available or has been made private."
        />
        <h1 className="text-xl font-semibold mb-2">Item Not Available</h1>
        <p className="text-muted-foreground text-center mb-6">
          This item doesn't exist or is private.
        </p>
        <Button onClick={() => navigate('/community')}>
          Explore Community
        </Button>
      </div>
    );
  }

  const displayImage = item.image_bg_removed_url || item.image_url;
  const displayName = item.name || item.brand || item.source_vendor_name || item.category;
  const creatorName = getCreatorDisplayName();
  const canonicalUrl = `${getPublicBaseUrl()}/share/item/${item.share_slug}`;

  return (
    <>
      <SEOHead
        title={`${displayName} - Azyah`}
        description={`Check out this ${item.category} item styled by ${creatorName} on Azyah`}
        image={displayImage}
        canonical={canonicalUrl}
        url={canonicalUrl}
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
              <h1 className="text-lg font-semibold">Item</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="container max-w-screen-md mx-auto px-4 py-6 pb-32">
          {/* Main image */}
          <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg bg-muted">
            <div className="aspect-square flex items-center justify-center p-4">
              <img
                src={displayImage}
                alt={displayName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>

          {/* Item info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">{displayName}</h2>
              <p className="text-muted-foreground capitalize">{item.category}</p>
            </div>

            {/* Creator attribution */}
            {item.creator_id && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={item.creator_avatar_url || undefined} />
                  <AvatarFallback>
                    {creatorName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {item.outfit_id ? 'Styled by' : 'Saved by'}
                  </p>
                  <p className="font-medium">{creatorName}</p>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="flex flex-wrap gap-2">
              {item.color && (
                <span className="px-3 py-1 bg-muted rounded-full text-sm">
                  {item.color}
                </span>
              )}
              {item.season && (
                <span className="px-3 py-1 bg-muted rounded-full text-sm capitalize">
                  {item.season}
                </span>
              )}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Source vendor */}
            {item.source_vendor_name && (
              <div className="text-sm text-muted-foreground">
                From <span className="font-medium">{item.source_vendor_name}</span>
              </div>
            )}
          </div>

          {/* More by creator section */}
          {creatorOutfits && creatorOutfits.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-3">More by {creatorName}</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {creatorOutfits.map((outfit) => (
                  <Card
                    key={outfit.id}
                    className="flex-shrink-0 w-28 cursor-pointer group hover:shadow-lg transition-all"
                    onClick={() => handleOutfitClick(outfit)}
                  >
                    <div className="aspect-[3/4] bg-muted overflow-hidden rounded-t-lg">
                      {(outfit.render_path || outfit.image_preview) ? (
                        <img
                          src={outfit.render_path || outfit.image_preview || ''}
                          alt={outfit.title || 'Outfit'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No preview
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs line-clamp-1 text-center">
                        {outfit.title || 'Untitled'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for "More by creator" */}
          {item.creator_id && (!creatorOutfits || creatorOutfits.length === 0) && (
            <div className="mt-8 p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                No more public outfits by {creatorName} yet
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 p-4 bg-muted/50 rounded-xl text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to add items like this to your wardrobe?
            </p>
            <Button onClick={() => navigate('/onboarding/signup')}>
              Join Azyah
            </Button>
          </div>
        </div>

        {/* Fixed bottom: Shop button if source_url exists */}
        {item.source_url && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
            <div className="container max-w-screen-md mx-auto">
              <Button 
                onClick={handleShopNow}
                className="w-full"
                size="lg"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop This Item
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
