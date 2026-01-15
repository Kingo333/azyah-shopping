import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStyleLinkData, StyleLinkOutfit } from '@/hooks/useStyleLinkData';
import { useStyleLinkStats, useLogStyleLinkEvent } from '@/hooks/useStyleLinkAnalytics';
import { StyleLinkModal } from '@/components/StyleLinkModal';
import { DealsAndCodesCenter } from '@/components/affiliate/DealsAndCodesCenter';
import { PublicPromoSection } from '@/components/affiliate/PublicPromoSection';
import { StyleLinkTutorial } from '@/components/StyleLinkTutorial';
import MiniDiscover from '@/components/MiniDiscover';
import StyleLinkTabs from '@/components/stylelink/StyleLinkTabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SmartTooltip } from '@/components/ui/smart-tooltip';
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
  const [discoverCategory, setDiscoverCategory] = useState<string>('all');

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

  const handleOutfitClick = (outfit: StyleLinkOutfit) => {
    if (!outfit.share_slug) return;
    
    logEvent.mutate({
      username: displayUsername!,
      eventType: 'outfit_click',
      targetSlug: outfit.share_slug,
    });

    navigate(`/share/outfit/${outfit.share_slug}`);
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
        {/* Hero Header - Compact */}
        <div className="relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/8 via-transparent to-[hsl(var(--azyah-maroon))]/5" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-[hsl(var(--azyah-maroon))]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-[hsl(var(--azyah-maroon))]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative pt-8 pb-4 px-4">
            {/* Back button and Tutorial for owner (not in preview mode) */}
            {effectiveIsOwner && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1 text-muted-foreground hover:text-foreground backdrop-blur-sm bg-background/50 rounded-full h-8 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <div className="backdrop-blur-sm bg-background/50 rounded-full">
                  <StyleLinkTutorial isOwner={effectiveIsOwner} />
                </div>
              </div>
            )}
            
            <div className="max-w-lg mx-auto text-center">
              {/* Avatar with glow effect - smaller */}
              <div className="relative inline-block mb-2">
                <div className="absolute inset-0 bg-[hsl(var(--azyah-maroon))]/20 rounded-full blur-lg scale-110" />
                <Avatar className="relative h-16 w-16 ring-2 ring-background shadow-lg">
                  <AvatarImage src={userData.avatar_url || undefined} alt={userData.name || displayUsername} />
                  <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--azyah-maroon))] to-[hsl(var(--azyah-maroon))]/80 text-white text-base font-bold">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <h1 className="text-lg font-bold tracking-tight">{userData.name || displayUsername}</h1>
              {userData.username && (
                <p className="text-[10px] text-muted-foreground mt-0.5">@{userData.username}</p>
              )}
              {userData.bio && (
                <p className="text-[10px] text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">{userData.bio}</p>
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
                  <div className="flex justify-center gap-1 mt-3">
                    <SmartTooltip content="Copy link">
                      <Button variant="outline" size="icon" className="h-9 w-9 min-w-[36px] min-h-[36px]" onClick={handleCopyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </SmartTooltip>
                    <SmartTooltip content="Share">
                      <Button variant="outline" size="icon" className="h-9 w-9 min-w-[36px] min-h-[36px]" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </SmartTooltip>
                    <SmartTooltip content="Show QR Code">
                      <Button variant="outline" size="icon" className="h-9 w-9 min-w-[36px] min-h-[36px]" onClick={() => setShowQRModal(true)}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </SmartTooltip>
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
                  size="sm"
                  className="bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 h-8 text-xs px-3"
                >
                  Open in Azyah
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Owner Stats Panel - Compact */}
        {effectiveIsOwner && stats && (
          <div className="px-4 py-2">
            <div className="max-w-lg mx-auto">
              {/* Inline Stats Row */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))]" />
                    <span className="text-xs font-semibold">{stats.page_views}</span>
                    <span className="text-[10px] text-muted-foreground">views</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MousePointer className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))]" />
                    <span className="text-xs font-semibold">{stats.outfit_clicks}</span>
                    <span className="text-[10px] text-muted-foreground">clicks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))]" />
                    <span className="text-xs font-semibold">{stats.shop_clicks}</span>
                    <span className="text-[10px] text-muted-foreground">shops</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    window.open(`${window.location.pathname}?preview=guest`, '_blank');
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
              </div>
              {stats.installs_attributed > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-[hsl(var(--azyah-maroon))]/5 text-center">
                  <p className="text-xs font-medium text-[hsl(var(--azyah-maroon))]">
                    🎉 {stats.installs_attributed} people joined via your link!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Owner Deals & Codes - Collapsible */}
        {effectiveIsOwner && (
          <div className="px-4 pb-2">
            <div className="max-w-lg mx-auto">
              <DealsAndCodesCenter />
            </div>
          </div>
        )}
        
        {/* Public Promos for Visitors */}
        {!effectiveIsOwner && displayUsername && (
          <PublicPromoSection username={displayUsername} />
        )}

        {/* StyleLink Tabs: Posts, Products, Styled */}
        <div className="px-4 py-6">
          <div className="max-w-lg mx-auto">
            <StyleLinkTabs
              userId={userData.user_id}
              isOwner={effectiveIsOwner}
              outfits={outfits}
              onOutfitClick={handleOutfitClick}
            />
          </div>
        </div>

        {/* Referral Section (Visitor View) */}
        {!effectiveIsOwner && (
          <div className="px-4 py-6 bg-gradient-to-b from-transparent to-[hsl(var(--azyah-maroon))]/5">
            <div className="max-w-lg mx-auto text-center">
              <img src="/marketing/azyah-logo.png" alt="" className="h-8 w-8 mx-auto mb-3 object-contain" />
              <h3 className="font-semibold mb-1">Join Azyah</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create outfits, earn points, redeem salon rewards
              </p>
              <Button 
                asChild
                size="sm"
                className="bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
              >
                <Link to={`/onboarding/signup${userData.referral_code ? `?ref=${userData.referral_code}` : ''}`} className="gap-1.5">
                  <img src="/marketing/azyah-logo.png" alt="" className="h-3.5 w-3.5 object-contain" />
                  Get Started Free
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Discover Strip - Enhanced with MiniDiscover */}
        <div className="px-4 py-6 border-t">
          <div className="max-w-lg mx-auto">
            <MiniDiscover
              title="Discover More"
              subtitle="Swipe to explore styles"
              limit={15}
              category={discoverCategory}
              onCategoryChange={setDiscoverCategory}
            />
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
