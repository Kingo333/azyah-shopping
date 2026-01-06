import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { ArrowLeft, ExternalLink, Share2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { nativeShare, getShareableUrl } from '@/lib/nativeShare';

interface PublicItem {
  id: string;
  image_url: string;
  image_bg_removed_url: string | null;
  brand: string | null;
  category: string;
  color: string | null;
  season: string | null;
  tags: string[] | null;
  source_product_id: string | null;
  source_url: string | null;
  source_vendor_name: string | null;
  created_at: string;
  // Attribution
  attribution_user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function PublicItemView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['public-item', id],
    queryFn: async (): Promise<PublicItem | null> => {
      if (!id) return null;

      // Fetch wardrobe item
      // Note: We check if this item belongs to a public outfit OR is public_reuse_permitted
      const { data: itemData, error: itemError } = await supabase
        .from('wardrobe_items')
        .select(`
          id, image_url, image_bg_removed_url, brand, category, color, season, tags,
          source_product_id, source_url, source_vendor_name, created_at, 
          attribution_user_id, public_reuse_permitted, user_id
        `)
        .eq('id', id)
        .single();

      if (itemError || !itemData) {
        return null;
      }

      // Check if item is publicly accessible:
      // Either public_reuse_permitted OR belongs to a public outfit
      if (!itemData.public_reuse_permitted) {
        // Check if it's part of any public outfit
        const { data: publicFitItem } = await supabase
          .from('fit_items')
          .select('fit_id, fits!inner(is_public)')
          .eq('wardrobe_item_id', id)
          .eq('fits.is_public', true)
          .limit(1)
          .single();

        if (!publicFitItem) {
          return null; // Not publicly accessible
        }
      }

      // Fetch attribution user if exists
      let attributionUser = null;
      if (itemData.attribution_user_id) {
        const { data: userData } = await supabase
          .from('public_profiles')
          .select('id, username, name, avatar_url')
          .eq('id', itemData.attribution_user_id)
          .single();
        attributionUser = userData;
      }

      return {
        ...itemData,
        attribution_user: attributionUser,
      };
    },
    enabled: !!id,
  });

  const handleShare = async () => {
    const shareUrl = getShareableUrl('item', id!);
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
  const displayName = item.brand || item.source_vendor_name || item.category;

  return (
    <>
      <SEOHead
        title={`${displayName} - Azyah`}
        description={`Check out this ${item.category} item on Azyah`}
        image={displayImage}
        canonical={`https://azyahstyle.com/share/item/${id}`}
        url={`https://azyahstyle.com/share/item/${id}`}
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