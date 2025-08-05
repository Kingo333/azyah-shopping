
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ExternalLink, Calendar, Heart, Tag, Copy } from 'lucide-react';
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
      await supabase
        .from('affiliate_links')
        .update({ clicks: links.find(l => l.id === linkId)?.clicks + 1 || 1 })
        .eq('id', linkId);
    } catch (error) {
      console.error('Error tracking click:', error);
    }
    
    // Open link
    window.open(url, '_blank');
  };

  const copyAffiliateCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Affiliate code copied to clipboard."
    });
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground">This affiliate page doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* User Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.name || 'Affiliate Partner'}</h1>
              <p className="text-muted-foreground">Fashion Affiliate</p>
            </div>
          </div>
          {user.bio && (
            <p className="text-muted-foreground">{user.bio}</p>
          )}
        </CardContent>
      </Card>

      {/* Affiliate Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Recommended Fashion Brands
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No public affiliate links available.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {links.map((link) => {
                const isExpired = link.expiry_date && new Date(link.expiry_date) < new Date();
                
                return (
                  <Card key={link.id} className={`transition-all duration-200 hover:shadow-md ${isExpired ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">{link.brand_name}</h3>
                        {isExpired && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                      
                      {link.description && (
                        <p className="text-muted-foreground text-sm mb-3">{link.description}</p>
                      )}

                      {link.affiliate_code && (
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {link.affiliate_code}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyAffiliateCode(link.affiliate_code!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <span>{link.clicks} clicks</span>
                        <span>{link.orders} orders</span>
                        {link.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Valid until {new Date(link.expiry_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full"
                        onClick={() => handleLinkClick(link.id, link.affiliate_url)}
                        disabled={isExpired}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Shop {link.brand_name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Affiliate;
