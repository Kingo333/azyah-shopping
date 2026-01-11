import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/SEOHead';
import { CompactPromoStrip } from '@/components/affiliate/CompactPromoStrip';
import { useOutfitDeals } from '@/hooks/useAffiliatePromos';
import { Share2, ExternalLink, Heart, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nativeShare, getShareableUrl, getPublicBaseUrl } from '@/lib/nativeShare';
import { openExternalUrl } from '@/lib/openExternalUrl';

interface OutfitItem {
  id: string;
  share_slug: string | null;
  image_url: string;
  image_bg_removed_url: string | null;
  brand: string | null;
  category: string;
  name: string | null;
  source_url: string | null;
  source_vendor_name: string | null;
  // Product-linked item fields
  source_product_id: string | null;
  product_title: string | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
}

interface PublicOutfit {
  id: string;
  title: string | null;
  render_path: string | null;
  image_preview: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  share_slug: string;
  user: {
    creator_id: string | null;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  };
  items: OutfitItem[];
}

interface CreatorOutfit {
  id: string;
  title: string | null;
  render_path: string | null;
  image_preview: string | null;
  share_slug: string;
}

export default function PublicOutfitView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  // Fetch deals for this outfit (up to 4)
  const { data: outfitDeals } = useOutfitDeals(slug);

  const { data: outfit, isLoading, error } = useQuery({
    queryKey: ['public-outfit-slug', slug],
    queryFn: async (): Promise<PublicOutfit | null> => {
      if (!slug) return null;

      // Fetch outfit by slug
      const { data: fitData, error: fitError } = await supabase
        .rpc('get_public_outfit_by_slug', { slug_param: slug });

      if (fitError || !fitData || fitData.length === 0) {
        return null;
      }

      const fit = fitData[0];

      // Get creator info by slug
      const { data: creatorData } = await supabase
        .rpc('get_public_outfit_creator_by_slug', { slug_param: slug });

      const creator = creatorData?.[0] || { creator_id: null, username: null, name: null, avatar_url: null };

      // Get all outfit items by slug
      const { data: itemsData } = await supabase
        .rpc('get_public_outfit_items_by_slug', { slug_param: slug });

      return {
        ...fit,
        user: creator,
        items: (itemsData || []) as OutfitItem[],
      };
    },
    enabled: !!slug,
  });

  // Fetch creator's other public outfits
  const { data: creatorOutfits } = useQuery({
    queryKey: ['creator-public-outfits-slug', outfit?.user?.creator_id, slug],
    queryFn: async (): Promise<CreatorOutfit[]> => {
      if (!outfit?.user?.creator_id) return [];

      const { data } = await supabase
        .rpc('get_creator_public_outfits_by_slug', { 
          creator_id_param: outfit.user.creator_id,
          exclude_slug_param: slug || null
        });

      return (data || []) as CreatorOutfit[];
    },
    enabled: !!outfit?.user?.creator_id,
  });

  const handleShare = async () => {
    if (!outfit?.share_slug) return;
    const shareUrl = getShareableUrl('outfit', outfit.share_slug);
    await nativeShare({
      title: outfit?.title || 'Check out this outfit on Azyah Style',
      text: `${getDisplayName(outfit?.user)} shared an outfit with you!`,
      url: shareUrl,
      dialogTitle: 'Share Outfit',
    });
  };

  const handleItemClick = (item: OutfitItem) => {
    if (item.share_slug) {
      navigate(`/share/item/${item.share_slug}`);
    }
  };

  const handleOutfitClick = (outfitData: CreatorOutfit) => {
    navigate(`/share/outfit/${outfitData.share_slug}`);
  };

  const handleShopItem = (e: React.MouseEvent, item: OutfitItem) => {
    e.stopPropagation();
    if (item.source_url) {
      openExternalUrl(item.source_url);
    }
  };

  // Helper to get display name with proper fallback
  const getDisplayName = (user?: { username: string | null; name: string | null }) => {
    if (!user) return 'Azyah user';
    return user.name || user.username || 'Azyah user';
  };

  // Match in-app behavior: product-linked items show product name, personal items show name/brand or "Untitled"
  const getItemDisplayName = (item: OutfitItem): string => {
    // Rule B: If linked to product from Discover, use product's real name
    if (item.source_product_id && item.product_title) {
      return item.product_title;
    }
    // Rule A: Personal item - use name/brand or "Untitled" (matches in-app OutfitDetail.tsx)
    return item.name || item.brand || 'Untitled';
  };

  // Get first item with brand logo (for badge near title) - picks highest z_index item
  const getBrandWithLogo = (items: OutfitItem[]): OutfitItem | null => {
    return items.find(item => 
      item.source_url && 
      item.source_product_id && 
      item.brand_logo_url
    ) || null;
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

  const displayName = getDisplayName(outfit.user);
  const outfitImage = outfit.render_path || outfit.image_preview;
  const canonicalUrl = `${getPublicBaseUrl()}/share/outfit/${outfit.share_slug}`;

  return (
    <>
      <SEOHead
        title={`${outfit.title || 'Outfit'} by ${displayName} - Azyah`}
        description={`Check out this outfit created by ${displayName} on Azyah`}
        image={outfitImage || undefined}
        canonical={canonicalUrl}
        url={canonicalUrl}
      />

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
        {/* Header */}
        <header 
          className="sticky top-0 z-10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b"
          style={{ paddingTop: 'var(--safe-top, 0px)' }}
        >
          <div className="container flex items-center justify-between h-14 max-w-screen-2xl px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold truncate">
                {outfit.title ? `Outfit — ${outfit.title}` : 'Outfit'}
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="container max-w-screen-xl mx-auto px-4 py-4 sm:py-6 pb-6">
          {/* Compact Promo Strip - show at top if deals exist */}
          {outfitDeals && outfitDeals.length > 0 && (
            <CompactPromoStrip deals={outfitDeals} className="mb-3" />
          )}
          
          {/* Grid layout - outfit left, details right (matching OutfitDetail.tsx) */}
          <div className="grid grid-cols-[1fr,120px] sm:grid-cols-[1fr,180px] md:grid-cols-[1fr,320px] lg:grid-cols-[1fr,360px] gap-3 sm:gap-4 md:gap-6">
            {/* Outfit Image with enhanced styling */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-muted/30 via-background to-muted/50 ring-1 ring-border/50">
              <div className="aspect-[3/4] flex items-center justify-center p-3 sm:p-4 md:p-6">
                {outfitImage ? (
                  <img
                    src={outfitImage}
                    alt={outfit.title || 'Outfit'}
                    className="max-w-full max-h-full object-contain rounded-xl drop-shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No preview available
                  </div>
                )}
              </div>
            </div>

            {/* Details Sidebar - compact on mobile */}
            <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
              {/* User info with enhanced styling */}
              <Card className="p-2 sm:p-3 bg-gradient-to-br from-background to-muted/30 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 ring-2 ring-background shadow-md">
                    <AvatarImage src={outfit.user.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--azyah-maroon))] to-[hsl(var(--azyah-maroon))]/80 text-white text-[10px] sm:text-xs font-bold">
                      {displayName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs sm:text-sm md:text-sm truncate">{displayName}</p>
                    <p className="text-[10px] sm:text-xs md:text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(outfit.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Title - hidden on mobile to save space */}
              {outfit.title && (
                <h2 className="hidden sm:block text-xs md:text-sm lg:text-base font-bold line-clamp-2">{outfit.title}</h2>
              )}

              {/* Brand logo badge - only when shop link + product + logo exists */}
              {(() => {
                const brandItem = outfit?.items ? getBrandWithLogo(outfit.items) : null;
                return brandItem?.brand_logo_url ? (
                  <div className="flex items-center gap-2">
                    <img 
                      src={brandItem.brand_logo_url} 
                      alt={brandItem.brand_name || 'Brand'} 
                      className="h-5 w-auto object-contain rounded"
                    />
                    {brandItem.brand_name && (
                      <span className="text-xs text-muted-foreground">{brandItem.brand_name}</span>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Clothes in outfit */}
              {outfit.items && outfit.items.length > 0 && (
                <div className="flex-1 min-h-0">
                  <h3 className="font-semibold text-xs sm:text-sm md:text-sm mb-2">Items</h3>
                  <div className="space-y-2 max-h-[200px] sm:max-h-[250px] md:max-h-[300px] overflow-y-auto scrollbar-hide">
                    {outfit.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0 bg-muted rounded-lg overflow-hidden group-hover:ring-2 ring-primary transition-all relative">
                          <img
                            src={item.image_bg_removed_url || item.image_url}
                            alt={item.name || item.brand || 'Item'}
                            className="w-full h-full object-contain"
                          />
                          {item.source_url && (
                            <button
                              onClick={(e) => handleShopItem(e, item)}
                              className="absolute top-0.5 right-0.5 bg-background/90 rounded-full p-0.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs md:text-sm line-clamp-2 flex-1 leading-tight">
                          {getItemDisplayName(item)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Join Azyah Button */}
              <Button onClick={() => navigate('/onboarding/signup')} className="w-full hidden sm:flex" size="sm">
                Join Azyah
              </Button>
            </div>
          </div>

          {/* Title and engagement - below the grid */}
          <div className="mt-4 flex items-center justify-between">
            {outfit.title && (
              <h2 className="font-bold text-base sm:text-lg line-clamp-1 flex-1 mr-4">{outfit.title}</h2>
            )}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>{outfit.like_count}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {outfit.comment_count} {outfit.comment_count === 1 ? 'comment' : 'comments'}
              </span>
            </div>
          </div>
        </div>

        {/* More by creator section */}
        {creatorOutfits && creatorOutfits.length > 0 && (
          <div className="mt-8 sm:mt-10 pt-6 border-t px-4 sm:px-6">
            <h3 className="font-semibold text-base sm:text-lg mb-4">More by {displayName}</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {creatorOutfits.map((creatorOutfit) => (
                <Card
                  key={creatorOutfit.id}
                  className="flex-shrink-0 w-28 sm:w-32 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden snap-start"
                  onClick={() => handleOutfitClick(creatorOutfit)}
                >
                  <div className="aspect-[3/4] bg-muted overflow-hidden">
                    <img
                      src={creatorOutfit.render_path || creatorOutfit.image_preview || '/placeholder.svg'}
                      alt={creatorOutfit.title || 'Outfit'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs line-clamp-1 font-medium">
                      {creatorOutfit.title || 'Untitled'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* CTA section */}
        <div className="container max-w-screen-md mx-auto px-4 mt-8">
          <Card className="p-6 bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 via-background to-muted/30 border-0 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Want to create outfits like this?
            </p>
            <Button onClick={() => navigate('/onboarding/signup')} className="bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90">
              Join Azyah
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
