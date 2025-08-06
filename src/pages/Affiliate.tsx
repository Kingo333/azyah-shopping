
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePublicAffiliateCodes } from '@/hooks/usePublicAffiliateCodes';
import PublicAffiliateCard from '@/components/PublicAffiliateCard';

interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

const Affiliate = () => {
  const { userId } = useParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { codes, loading: codesLoading, error } = usePublicAffiliateCodes(userId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userId && mounted) {
      fetchUserProfile();
    }
  }, [userId, mounted]);

  const fetchUserProfile = async () => {
    try {
      console.log('Fetching user profile for:', userId);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, bio, avatar_url')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('User error:', userError);
        throw userError;
      }
      
      console.log('User data:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load affiliate page",
        variant: "destructive"
      });
    } finally {
      setUserLoading(false);
    }
  };

  const handleLinkClick = async (linkId: string, url: string) => {
    // Track click
    try {
      const currentLink = codes.find(l => l.id === linkId);
      const { error } = await supabase
        .from('affiliate_links')
        .update({ clicks: (currentLink?.clicks || 0) + 1 })
        .eq('id', linkId);
        
      if (error) {
        console.error('Error tracking click:', error);
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || userLoading || codesLoading) {
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
            <h1 className="text-2xl font-bold mb-4 font-playfair">User Not Found</h1>
            <p className="text-muted-foreground">This affiliate page doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 font-playfair">Error Loading Page</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* User Profile Header */}
        <Card className="mb-8 border-0 shadow-lg bg-card backdrop-blur-sm rounded-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              <Avatar className="h-24 w-24 ring-4 ring-[#A30000]/20">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-[#A30000] to-red-600 text-white font-playfair">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-foreground font-playfair">
                  {user.name || 'Affiliate Partner'}
                </h1>
                <p className="text-lg text-muted-foreground">Fashion Affiliate & Style Curator</p>
                <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">Trusted Partner</span>
                </div>
              </div>
            </div>
            {user.bio && (
              <div className="bg-gradient-to-r from-[#A30000]/5 to-pink-50 p-4 rounded-xl">
                <p className="text-muted-foreground text-center md:text-left">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affiliate Links */}
        <Card className="border-0 shadow-lg bg-card backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl font-playfair">
              <div className="p-2 bg-gradient-to-br from-[#A30000] to-red-600 rounded-xl">
                <Heart className="h-6 w-6 text-white" />
              </div>
              Exclusive Fashion Deals & Codes
            </CardTitle>
            <p className="text-muted-foreground">
              Discover amazing deals from top fashion brands with exclusive discount codes
            </p>
          </CardHeader>
          <CardContent>
            {codes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-playfair">No exclusive deals available yet.</p>
                <p>Check back soon for amazing fashion offers!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {codes.map((code) => (
                  <PublicAffiliateCard
                    key={code.id}
                    brand_name={code.brand_name}
                    description={code.description}
                    affiliate_code={code.affiliate_code}
                    affiliate_url={code.affiliate_url}
                    expiry_date={code.expiry_date}
                    onLinkClick={() => handleLinkClick(code.id, code.affiliate_url)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p className="font-playfair">✨ Curated with love by {user.name || 'your fashion affiliate'} ✨</p>
          <p className="mt-1">All deals are verified and updated regularly</p>
        </div>
      </div>
    </div>
  );
};

export default Affiliate;
