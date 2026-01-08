import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStyleLinkData } from '@/hooks/useStyleLinkData';
import { useStyleLinkStats, useLogStyleLinkEvent } from '@/hooks/useStyleLinkAnalytics';
import { StyleLinkModal } from '@/components/StyleLinkModal';
import { DealsAndCodesCenter } from '@/components/affiliate/DealsAndCodesCenter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Copy, Share2, QrCode, ExternalLink, Heart, MessageCircle, 
  Eye, MousePointer, ShoppingBag, Sparkles, ArrowRight, Tag,
  Instagram, Globe, Twitter
} from 'lucide-react';
import { toast } from 'sonner';
import { SITE_URL, nativeShare } from '@/lib/nativeShare';
import { useState } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { Capacitor } from '@capacitor/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// TikTok icon component (lucide doesn't have one)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export default function StyleLinkPage() {
  const { username: identifier } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userData, outfits, isOwner, isLoading, isError } = useStyleLinkData(identifier);
  const { data: stats } = useStyleLinkStats(isOwner ? userData?.user_id : undefined);
  const logEvent = useLogStyleLinkEvent();
  const [showQRModal, setShowQRModal] = useState(false);

  // Redirect UUID URLs to canonical username URLs
  useEffect(() => {
    if (userData?.username && identifier) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUUID && userData.username !== identifier) {
        navigate(`/u/${userData.username}`, { replace: true });
      }
    }
  }, [userData, identifier, navigate]);

  // Log page view on mount
  useEffect(() => {
    if (identifier && userData?.user_id) {
      logEvent.mutate({
        username: userData.username || identifier,
        eventType: 'page_view',
        referrerUrl: document.referrer || undefined,
      });
    }
  }, [identifier, userData?.user_id]);

  // Fetch trending products for Discover strip
  interface TrendingProduct {
    id: string;
    title: string;
    image_url?: string;
    price_cents?: number;
    currency?: string;
  }
  
  const { data: trendingProducts } = useQuery({
    queryKey: ['style-link-discover-products'],
    queryFn: async (): Promise<TrendingProduct[]> => {
      const { data, error } = await supabase.rpc('get_fallback_trending_categories', {
        limit_count: 3
      });
      if (error) {
        console.error('Error fetching trending products:', error);
        return [];
      }
      // Flatten recent_products from all categories - handle Json type
      const products: TrendingProduct[] = [];
      for (const cat of data || []) {
        const recentProducts = cat.recent_products as unknown;
        if (Array.isArray(recentProducts)) {
          products.push(...(recentProducts as TrendingProduct[]));
        }
      }
      return products.slice(0, 6);
    },
  });

  // Build Style Link URL using username (canonical)
  const displayUsername = userData?.username || identifier;
  const styleLinkUrl = userData?.referral_code
    ? `${SITE_URL}/u/${displayUsername}?ref=${userData.referral_code}`
    : `${SITE_URL}/u/${displayUsername}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(styleLinkUrl);
      toast.success('Link copied! Share it everywhere ✨');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    await nativeShare({
      title: `${userData?.name || displayUsername}'s Style Link`,
      text: 'Check out my outfits and style on Azyah!',
      url: styleLinkUrl,
      dialogTitle: 'Share Style Link',
    });
  };

  const handleOpenInApp = () => {
    logEvent.mutate({
      username: displayUsername!,
      eventType: 'open_in_app_click',
    });

    const deepLink = `com.azyah.style://u/${displayUsername}`;
    
    if (!Capacitor.isNativePlatform()) {
      const now = Date.now();
      window.location.href = deepLink;
      
      setTimeout(() => {
        if (document.visibilityState === 'visible' && Date.now() - now > 2000) {
          toast.info(
            <div className="space-y-2">
              <p className="font-medium">App not installed?</p>
              <a 
                href="https://apps.apple.com/app/azyah-style/id6738380298" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--azyah-maroon))] underline"
              >
                Download Azyah from the App Store
              </a>
            </div>,
            { duration: 5000 }
          );
        }
      }, 2500);
    }
  };

  const handleOutfitClick = (slug: string | null) => {
    if (!slug) return;
    
    logEvent.mutate({
      username: displayUsername!,
      eventType: 'outfit_click',
      targetSlug: slug,
    });

    navigate(`/share/outfit/${slug}`);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOutfitImage = (outfit: typeof outfits[0]) => {
    if (outfit.render_path) {
      return `https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/outfit-renders/${outfit.render_path}`;
    }
    return outfit.image_preview || '/placeholder.svg';
  };

  const formatPrice = (priceCents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(priceCents / 100);
  };

  // Check if socials has any valid links
  const hasSocials = userData?.socials && (
    userData.socials.instagram_url || 
    userData.socials.tiktok_url || 
    userData.socials.twitter_url || 
    userData.socials.website
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--azyah-maroon))]" />
      </div>
    );
  }

  if (isError || !userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-xl font-semibold mb-2">User not found</h1>
        <p className="text-muted-foreground mb-4">This Style Link page doesn't exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${userData.name || displayUsername}'s Style | Azyah`}
        description={userData.bio || `Check out ${userData.name || displayUsername}'s outfits and style on Azyah`}
        image={userData.avatar_url || undefined}
        canonical={`${SITE_URL}/u/${userData.username || identifier}`}
      />

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="bg-gradient-to-b from-[hsl(var(--azyah-maroon))]/5 to-transparent pt-12 pb-6 px-4">
          <div className="max-w-lg mx-auto text-center">
            <Avatar className="h-20 w-20 mx-auto mb-3 ring-2 ring-[hsl(var(--azyah-maroon))]/20 ring-offset-2">
              <AvatarImage src={userData.avatar_url || undefined} alt={userData.name || displayUsername} />
              <AvatarFallback className="bg-[hsl(var(--azyah-maroon))]/10 text-[hsl(var(--azyah-maroon))] text-lg font-semibold">
                {getInitials(userData.name)}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-xl font-semibold">{userData.name || displayUsername}</h1>
            {userData.username && (
              <p className="text-sm text-muted-foreground">@{userData.username}</p>
            )}
            {userData.bio && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{userData.bio}</p>
            )}

            {/* Social Links */}
            {hasSocials && (
              <div className="flex justify-center gap-3 mt-3">
                {userData.socials?.instagram_url && (
                  <a 
                    href={`https://instagram.com/${userData.socials.instagram_url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {userData.socials?.tiktok_url && (
                  <a 
                    href={`https://tiktok.com/@${userData.socials.tiktok_url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                )}
                {userData.socials?.twitter_url && (
                  <a 
                    href={`https://x.com/${userData.socials.twitter_url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {userData.socials?.website && (
                  <a 
                    href={userData.socials.website.startsWith('http') ? userData.socials.website : `https://${userData.socials.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}

            {/* Owner Controls */}
            {isOwner && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowQRModal(true)} className="gap-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  QR
                </Button>
              </div>
            )}

            {/* Visitor CTA */}
            {!isOwner && (
              <Button 
                onClick={handleOpenInApp}
                className="mt-4 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Azyah
              </Button>
            )}
          </div>
        </div>

        {/* Owner Stats Panel */}
        {isOwner && stats && (
          <div className="px-4 py-4 border-b">
            <div className="max-w-lg mx-auto">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">Your Stats</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Card className="p-2">
                  <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{stats.page_views}</p>
                  <p className="text-[10px] text-muted-foreground">Views</p>
                </Card>
                <Card className="p-2">
                  <MousePointer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{stats.outfit_clicks}</p>
                  <p className="text-[10px] text-muted-foreground">Outfit Clicks</p>
                </Card>
                <Card className="p-2">
                  <ShoppingBag className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{stats.shop_clicks}</p>
                  <p className="text-[10px] text-muted-foreground">Shop Clicks</p>
                </Card>
              </div>
              {stats.installs_attributed > 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  🎉 {stats.installs_attributed} people joined via your link!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Owner Deals & Codes Center */}
        {isOwner && (
          <div className="px-4 py-4 border-b">
            <div className="max-w-lg mx-auto">
              <DealsAndCodesCenter />
            </div>
          </div>
        )}

        {/* Outfits Grid */}
        <div className="px-4 py-6">
          <div className="max-w-lg mx-auto">
            <h2 className="text-sm font-semibold mb-4">
              {isOwner ? 'Your Public Outfits' : 'Outfits'}
            </h2>

            {outfits.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-2">No public outfits yet</p>
                {isOwner && (
                  <Button variant="link" onClick={() => navigate('/dress-me')} className="text-[hsl(var(--azyah-maroon))]">
                    Create your first outfit →
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {outfits.map((outfit) => (
                  <Card
                    key={outfit.id}
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleOutfitClick(outfit.share_slug)}
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={getOutfitImage(outfit)}
                        alt={outfit.title || 'Outfit'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{outfit.title || 'Untitled Outfit'}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-3 w-3" />
                          {outfit.like_count}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="h-3 w-3" />
                          {outfit.comment_count}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Referral Section (Visitor View) */}
        {!isOwner && (
          <div className="px-4 py-6 bg-gradient-to-b from-transparent to-[hsl(var(--azyah-maroon))]/5">
            <div className="max-w-lg mx-auto text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-[hsl(var(--azyah-maroon))]" />
              <h3 className="font-semibold mb-1">Join Azyah</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create outfits, earn points, redeem salon rewards
              </p>
              <Button 
                asChild
                className="bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
              >
                <Link to={`/onboarding/signup${userData.referral_code ? `?ref=${userData.referral_code}` : ''}`}>
                  Get Started Free
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Discover Strip */}
        <div className="px-4 py-6 border-t">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Discover More</h3>
              <Button variant="ghost" size="sm" asChild className="text-[hsl(var(--azyah-maroon))] gap-1">
                <Link to="/swipe">
                  Browse All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            
            {/* Horizontal product scroll */}
            {trendingProducts && trendingProducts.length > 0 ? (
              <>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {trendingProducts.map((product) => (
                    <Link 
                      key={product.id}
                      to={`/swipe?product=${product.id}`}
                      className="flex-shrink-0 w-28"
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-[3/4] bg-muted">
                          <img 
                            src={product.image_url || '/placeholder.svg'} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-1.5">
                          <p className="text-[9px] font-medium truncate">{product.title}</p>
                          {product.price_cents && (
                            <p className="text-[8px] text-muted-foreground">
                              {formatPrice(product.price_cents, product.currency)}
                            </p>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex gap-2 mt-4">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to="/swipe">
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Swipe to Discover
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <Card className="p-4 text-center bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 to-transparent">
                <p className="text-sm text-muted-foreground mb-3">
                  Swipe to discover products that match your style
                </p>
                <div className="flex justify-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/swipe">
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Swipe to Discover
                    </Link>
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Sticky Bottom Bar (Visitor Only) */}
        {!isOwner && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3 safe-area-inset-bottom">
            <div className="max-w-lg mx-auto flex gap-2">
              <Button 
                onClick={handleOpenInApp}
                className="flex-1 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
              >
                Open in Azyah
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link to="/swipe">Shop Discover</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <StyleLinkModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        username={userData.username || identifier || ''}
        referralCode={userData?.referral_code}
      />
    </>
  );
}
