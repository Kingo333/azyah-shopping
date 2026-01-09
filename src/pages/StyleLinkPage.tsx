import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStyleLinkData } from '@/hooks/useStyleLinkData';
import { useStyleLinkStats, useLogStyleLinkEvent } from '@/hooks/useStyleLinkAnalytics';
import { StyleLinkModal } from '@/components/StyleLinkModal';
import { DealsAndCodesCenter } from '@/components/affiliate/DealsAndCodesCenter';
import { PublicPromoSection } from '@/components/affiliate/PublicPromoSection';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Loader2, Copy, Share2, QrCode, ExternalLink, Heart, MessageCircle, 
  Eye, MousePointer, ShoppingBag, Sparkles, ArrowRight, Tag,
  Instagram, Globe, Twitter, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { getStyleLinkUrl, getPublicBaseUrl, nativeShare } from '@/lib/nativeShare';
import { SEOHead } from '@/components/SEOHead';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userData, outfits, isOwner, isLoading, isError } = useStyleLinkData(identifier);
  
  // Check for preview mode - allows owner to see page as guest would
  const isPreviewMode = searchParams.get('preview') === 'guest';
  const effectiveIsOwner = isOwner && !isPreviewMode;
  
  const { data: stats } = useStyleLinkStats(effectiveIsOwner ? userData?.user_id : undefined);
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

  // Build Style Link URL using centralized helper
  const displayUsername = userData?.username || identifier;
  const styleLinkUrl = getStyleLinkUrl(displayUsername || '', userData?.referral_code);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

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

  // Check if we're on native platform (safe detection)
  const isNativePlatform = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' ||
    (window as any).Capacitor?.isNativePlatform?.()
  );

  const handleOpenInApp = () => {
    logEvent.mutate({
      username: displayUsername!,
      eventType: 'open_in_app_click',
    });

    const deepLink = `com.azyah.style://u/${displayUsername}`;
    
    if (!isNativePlatform) {
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
      // If render_path is already a full URL, use it directly
      if (outfit.render_path.startsWith('http')) {
        return outfit.render_path;
      }
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
        canonical={`${getPublicBaseUrl()}/u/${userData.username || identifier}`}
      />

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/8 via-transparent to-[hsl(var(--azyah-maroon))]/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--azyah-maroon))]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[hsl(var(--azyah-maroon))]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative pt-12 pb-8 px-4">
            {/* Back button for owner (not in preview mode) */}
            {effectiveIsOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="absolute top-4 left-4 gap-1 text-muted-foreground hover:text-foreground backdrop-blur-sm bg-background/50 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            
            <div className="max-w-lg mx-auto text-center">
              {/* Avatar with glow effect */}
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-[hsl(var(--azyah-maroon))]/20 rounded-full blur-xl scale-110" />
                <Avatar className="relative h-24 w-24 ring-4 ring-background shadow-xl">
                  <AvatarImage src={userData.avatar_url || undefined} alt={userData.name || displayUsername} />
                  <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--azyah-maroon))] to-[hsl(var(--azyah-maroon))]/80 text-white text-xl font-bold">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight">{userData.name || displayUsername}</h1>
              {userData.username && (
                <p className="text-sm text-muted-foreground mt-0.5">@{userData.username}</p>
              )}
              {userData.bio && (
                <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto leading-relaxed">{userData.bio}</p>
              )}

            {/* Owner Controls - Compact Icon Buttons */}
            {effectiveIsOwner && (
              <>
                {/* Social Links for owner */}
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
                <TooltipProvider>
                  <div className="flex justify-center gap-1.5 mt-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyLink}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy link</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleShare}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowQRModal(true)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Show QR Code</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </>
            )}

            {/* Visitor CTA with Social Links */}
            {!effectiveIsOwner && (
              <div className="mt-4 flex flex-col items-center gap-3">
                {hasSocials && (
                  <div className="flex justify-center gap-3">
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
                <Button 
                  onClick={handleOpenInApp}
                  className="bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Azyah
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Owner Stats Panel */}
        {effectiveIsOwner && stats && (
          <div className="px-4 py-4">
            <div className="max-w-lg mx-auto space-y-3">
              <h3 className="text-sm font-semibold">Your Stats</h3>
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 bg-gradient-to-br from-background to-muted/30 border-0 shadow-sm">
                  <Eye className="h-4 w-4 mx-auto mb-1.5 text-[hsl(var(--azyah-maroon))]" />
                  <p className="text-lg font-bold text-center">{stats.page_views}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">Views</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-background to-muted/30 border-0 shadow-sm">
                  <MousePointer className="h-4 w-4 mx-auto mb-1.5 text-[hsl(var(--azyah-maroon))]" />
                  <p className="text-lg font-bold text-center">{stats.outfit_clicks}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">Outfit Clicks</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-background to-muted/30 border-0 shadow-sm">
                  <ShoppingBag className="h-4 w-4 mx-auto mb-1.5 text-[hsl(var(--azyah-maroon))]" />
                  <p className="text-lg font-bold text-center">{stats.shop_clicks}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">Shop Clicks</p>
                </Card>
              </div>
              {stats.installs_attributed > 0 && (
                <div className="p-3 rounded-lg bg-[hsl(var(--azyah-maroon))]/5 text-center">
                  <p className="text-sm font-medium text-[hsl(var(--azyah-maroon))]">
                    🎉 {stats.installs_attributed} people joined via your link!
                  </p>
                </div>
              )}
              
              {/* Preview as Guest Bar */}
              <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">See how others view your page</p>
                  <p className="text-xs text-muted-foreground">Preview without owner controls</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    window.open(`${window.location.pathname}?preview=guest`, '_blank');
                  }}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Preview
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Owner Deals & Codes Center */}
        {effectiveIsOwner && (
          <div className="px-4 py-4 border-b">
            <div className="max-w-lg mx-auto">
              <DealsAndCodesCenter />
            </div>
          </div>
        )}
        
        {/* Public Promos for Visitors */}
        {!effectiveIsOwner && displayUsername && (
          <PublicPromoSection username={displayUsername} />
        )}

        {/* Outfits Grid */}
        <div className="px-4 py-6">
          <div className="max-w-lg mx-auto">
            <h2 className="text-sm font-semibold mb-4">
              {effectiveIsOwner ? 'Your Public Outfits' : 'Outfits'}
            </h2>

            {outfits.length === 0 ? (
              <Card className="p-8 text-center bg-gradient-to-br from-muted/30 to-transparent border-dashed">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-3">No public outfits yet</p>
                {effectiveIsOwner && (
                  <Button onClick={() => navigate('/dress-me')} className="bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90">
                    Create your first outfit
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {outfits.map((outfit) => (
                  <Card
                    key={outfit.id}
                    className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-sm"
                    onClick={() => handleOutfitClick(outfit.share_slug)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
                      <img
                        src={getOutfitImage(outfit)}
                        alt={outfit.title || 'Outfit'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate flex-1 min-w-0">{outfit.title || 'Untitled Outfit'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-2">
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
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Referral Section (Visitor View) */}
        {!effectiveIsOwner && (
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

              </>
            ) : (
              <Card className="p-4 text-center bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 to-transparent">
                <p className="text-sm text-muted-foreground mb-3">
                  Discover products that match your style
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/swipe">
                    Browse All
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </Card>
            )}
          </div>
        </div>
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
