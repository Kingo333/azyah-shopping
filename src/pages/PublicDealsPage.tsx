import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SEOHead } from '@/components/SEOHead';
import { SITE_URL } from '@/lib/nativeShare';
import { usePublicDeals } from '@/hooks/useAffiliatePromos';
import { Tag, Copy, ExternalLink, Clock, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export default function PublicDealsPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { data: deals, isLoading: dealsLoading } = usePublicDeals(username);

  // Fetch user info
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user-for-deals', username],
    queryFn: async (): Promise<UserData | null> => {
      if (!username) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, avatar_url, bio')
        .eq('username', username)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!username,
  });

  const isLoading = dealsLoading || userLoading;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const getDaysLeftText = (daysLeft: number | null) => {
    if (daysLeft === null) return null;
    if (daysLeft === 0) return 'Ends today!';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOutfitImage = (preview: string | null) => {
    if (!preview) return '/placeholder.svg';
    if (preview.startsWith('http')) return preview;
    return `https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/outfit-renders/${preview}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--azyah-maroon))]"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <SEOHead 
          title="User Not Found - Azyah"
          description="This user doesn't exist."
        />
        <h1 className="text-xl font-semibold mb-2">User Not Found</h1>
        <p className="text-muted-foreground text-center mb-6">
          This user doesn't exist or has no public deals.
        </p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const displayName = userData.name || userData.username;

  return (
    <>
      <SEOHead
        title={`${displayName}'s Deals & Codes | Azyah`}
        description={`Shop ${displayName}'s exclusive deals and discount codes on Azyah`}
        canonical={`${SITE_URL}/u/${username}/deals`}
      />

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header 
          className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b"
          style={{ paddingTop: 'var(--safe-top, 0px)' }}
        >
          <div className="container flex items-center justify-between h-14 max-w-screen-2xl px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/u/${username}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">Deals & Codes</h1>
            </div>
          </div>
        </header>

        {/* User Header */}
        <div className="bg-gradient-to-b from-[hsl(var(--azyah-maroon))]/5 to-transparent pt-6 pb-4 px-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-[hsl(var(--azyah-maroon))]/20">
              <AvatarImage src={userData.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(var(--azyah-maroon))]/10 text-[hsl(var(--azyah-maroon))]">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">@{userData.username}</p>
            </div>
          </div>
        </div>

        {/* Deals List */}
        <div className="px-4 py-6">
          <div className="max-w-lg mx-auto space-y-4">
            {!deals || deals.length === 0 ? (
              <Card className="p-8 text-center">
                <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No active deals right now</p>
                <Button variant="link" asChild className="mt-2 text-[hsl(var(--azyah-maroon))]">
                  <Link to={`/u/${username}`}>View {displayName}'s outfits →</Link>
                </Button>
              </Card>
            ) : (
              deals.map((deal) => (
                <Card key={deal.promo_id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center flex-shrink-0">
                        <Tag className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {deal.promo_name || 'Exclusive Offer'}
                          </h3>
                          {deal.days_left !== null && (
                            <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getDaysLeftText(deal.days_left)}
                            </Badge>
                          )}
                        </div>
                        
                        {deal.affiliate_code && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Use code:</span>
                            <code className="text-sm font-bold bg-muted px-2 py-1 rounded font-mono">
                              {deal.affiliate_code}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={() => copyCode(deal.affiliate_code!)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {deal.affiliate_url && (
                          <Button 
                            size="sm" 
                            className="mt-3 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 gap-1.5"
                            onClick={() => window.open(deal.affiliate_url!, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Shop Now
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Attached Outfits Preview */}
                    {deal.attached_outfits && deal.attached_outfits.length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Applies to {deal.attached_outfits.length} outfit{deal.attached_outfits.length !== 1 ? 's' : ''}:
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {deal.attached_outfits.map((outfit) => (
                            <Link
                              key={outfit.outfit_id}
                              to={`/share/outfit/${outfit.share_slug}`}
                              className="flex-shrink-0 w-16 group"
                            >
                              <div className="aspect-square rounded-lg overflow-hidden bg-muted group-hover:ring-2 ring-[hsl(var(--azyah-maroon))]">
                                <img
                                  src={getOutfitImage(outfit.image_preview)}
                                  alt={outfit.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <p className="text-[9px] mt-1 truncate">{outfit.title}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 py-6 border-t">
          <div className="max-w-lg mx-auto text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-[hsl(var(--azyah-maroon))]" />
            <h3 className="font-semibold mb-1">Want your own Deals page?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Join Azyah and share your style with affiliate links
            </p>
            <Button 
              asChild
              className="bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
            >
              <Link to="/onboarding/signup">
                Get Started Free
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
