import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStyleLinkData } from '@/hooks/useStyleLinkData';
import { useStyleLinkStats, useLogStyleLinkEvent } from '@/hooks/useStyleLinkAnalytics';
import { StyleLinkModal } from '@/components/StyleLinkModal';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, Copy, Share2, QrCode, ExternalLink, Heart, MessageCircle, Eye, MousePointer, ShoppingBag, Download, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { SITE_URL, nativeShare } from '@/lib/nativeShare';
import { useState } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { Capacitor } from '@capacitor/core';

export default function StyleLinkPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userData, outfits, isOwner, isLoading, isError } = useStyleLinkData(username);
  const { data: stats } = useStyleLinkStats(isOwner ? userData?.user_id : undefined);
  const logEvent = useLogStyleLinkEvent();
  const [showQRModal, setShowQRModal] = useState(false);

  // Log page view on mount
  useEffect(() => {
    if (username && userData?.user_id) {
      logEvent.mutate({
        username,
        eventType: 'page_view',
        referrerUrl: document.referrer || undefined,
      });
    }
  }, [username, userData?.user_id]);

  // Build Style Link URL
  const styleLinkUrl = userData?.referral_code
    ? `${SITE_URL}/u/${username}?ref=${userData.referral_code}`
    : `${SITE_URL}/u/${username}`;

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
      title: `${userData?.name || username}'s Style Link`,
      text: 'Check out my outfits and style on Azyah!',
      url: styleLinkUrl,
      dialogTitle: 'Share Style Link',
    });
  };

  const handleOpenInApp = () => {
    logEvent.mutate({
      username: username!,
      eventType: 'open_in_app_click',
    });

    // Try deep link first
    const deepLink = `com.azyah.style://u/${username}`;
    
    // On iOS Safari, we need a different approach
    if (!Capacitor.isNativePlatform()) {
      // Create a hidden iframe to test app opening
      const now = Date.now();
      window.location.href = deepLink;
      
      // If we're still here after a delay, app is not installed
      setTimeout(() => {
        // If page is still visible, app didn't open
        if (document.visibilityState === 'visible' && Date.now() - now > 2000) {
          // Show fallback UI instead of auto-redirect
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
      username: username!,
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
        title={`${userData.name || username}'s Style | Azyah`}
        description={userData.bio || `Check out ${userData.name || username}'s outfits and style on Azyah`}
        image={userData.avatar_url || undefined}
        canonical={`${SITE_URL}/u/${username}`}
      />

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="bg-gradient-to-b from-[hsl(var(--azyah-maroon))]/5 to-transparent pt-12 pb-6 px-4">
          <div className="max-w-lg mx-auto text-center">
            <Avatar className="h-20 w-20 mx-auto mb-3 ring-2 ring-[hsl(var(--azyah-maroon))]/20 ring-offset-2">
              <AvatarImage src={userData.avatar_url || undefined} alt={userData.name || username} />
              <AvatarFallback className="bg-[hsl(var(--azyah-maroon))]/10 text-[hsl(var(--azyah-maroon))] text-lg font-semibold">
                {getInitials(userData.name)}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-xl font-semibold">{userData.name || username}</h1>
            {userData.username && (
              <p className="text-sm text-muted-foreground">@{userData.username}</p>
            )}
            {userData.bio && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{userData.bio}</p>
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
        username={username || ''}
        referralCode={userData?.referral_code}
      />
    </>
  );
}
