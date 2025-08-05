
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ExternalLink, Calendar, Heart, Tag, Copy, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AffiliateLink {
  id: string;
  brand_name: string;
  description: string | null;
  affiliate_url: string;
  affiliate_code: string | null;
  expiry_date: string | null;
  clicks: number;
  orders: number;
}

interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

const Affiliate = () => {
  const { userId } = useParams();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchPublicAffiliateLinks();
    }
  }, [userId]);

  const fetchPublicAffiliateLinks = async () => {
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, bio, avatar_url')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUser(userData);

      // Fetch public affiliate links
      const { data: linksData, error: linksError } = await supabase
        .from('affiliate_links')
        .select('id, brand_name, description, affiliate_url, affiliate_code, expiry_date, clicks, orders')
        .eq('user_id', userId)
        .eq('is_public', true)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;
      setLinks(linksData || []);
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = async (linkId: string, url: string) => {
    // Track click
    try {
      const currentLink = links.find(l => l.id === linkId);
      await supabase
        .from('affiliate_links')
        .update({ clicks: (currentLink?.clicks || 0) + 1 })
        .eq('id', linkId);
    } catch (error) {
      console.error('Error tracking click:', error);
    }
    
    // Open link
    window.open(url, '_blank');
  };

  const copyAffiliateCode = (code: string, brandName: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied!",
      description: `${brandName} affiliate code copied to clipboard.`
    });
  };

  const copyAffiliateLink = (url: string, brandName: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: `${brandName} affiliate link copied to clipboard.`
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-16 w-16 bg-muted rounded-full mx-auto"></div>
              <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
              <div className="h-3 bg-muted rounded w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <p className="text-muted-foreground">This affiliate page doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* User Profile Header */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              <Avatar className="h-24 w-24 ring-4 ring-pink-100">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  {user.name || 'Affiliate Partner'}
                </h1>
                <p className="text-lg text-muted-foreground">Fashion Affiliate & Style Curator</p>
                <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-muted-foreground ml-1">Trusted Partner</span>
                </div>
              </div>
            </div>
            {user.bio && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
                <p className="text-muted-foreground text-center md:text-left">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affiliate Links */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-pink-400 to-purple-400 rounded-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              Exclusive Fashion Deals & Codes
            </CardTitle>
            <p className="text-muted-foreground">
              Discover amazing deals from top fashion brands with exclusive discount codes
            </p>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg">No exclusive deals available yet.</p>
                <p>Check back soon for amazing fashion offers!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {links.map((link) => {
                  const isExpired = link.expiry_date && new Date(link.expiry_date) < new Date();
                  
                  return (
                    <Card 
                      key={link.id} 
                      className={`group transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-0 shadow-md bg-gradient-to-br from-white to-gray-50 overflow-hidden ${
                        isExpired ? 'opacity-60' : ''
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-xl text-gray-900 mb-1">{link.brand_name}</h3>
                            {isExpired && (
                              <Badge variant="destructive" className="mb-2">
                                Expired
                              </Badge>
                            )}
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div>{link.clicks} uses</div>
                            <div>{link.orders} orders</div>
                          </div>
                        </div>
                        
                        {link.description && (
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {link.description}
                          </p>
                        )}

                        {link.affiliate_code && (
                          <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Tag className="h-4 w-4 text-pink-600" />
                                  <span className="text-sm font-medium text-pink-800">Exclusive Code</span>
                                </div>
                                <div className="text-2xl font-bold font-mono text-pink-800 tracking-wider">
                                  {link.affiliate_code}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => copyAffiliateCode(link.affiliate_code!, link.brand_name)}
                                className="bg-pink-600 hover:bg-pink-700 text-white shrink-0"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {link.expiry_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                            <Calendar className="h-4 w-4" />
                            Valid until {new Date(link.expiry_date).toLocaleDateString()}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Button 
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-2.5"
                            onClick={() => handleLinkClick(link.id, link.affiliate_url)}
                            disabled={isExpired}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Shop {link.brand_name}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => copyAffiliateLink(link.affiliate_url, link.brand_name)}
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Copy Link
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>✨ Curated with love by {user.name || 'your fashion affiliate'} ✨</p>
          <p className="mt-1">All deals are verified and updated regularly</p>
        </div>
      </div>
    </div>
  );
};

export default Affiliate;
