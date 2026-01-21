import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { Users, Palette } from 'lucide-react';
import HorizontalCarousel from './HorizontalCarousel';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName, getDisplayNameInitial } from '@/utils/userDisplayName';

export const FollowingTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { following, followingLoading } = useFollows();

  // Fetch content from followed users
  const { data: followedContent, isLoading } = useQuery({
    queryKey: ['following-content', following],
    queryFn: async () => {
      if (!following?.length) return { users: [], brands: [] };

      // Get user details for followed users (using public_profiles table)
      const { data: usersData } = await supabase
        .from('public_profiles')
        .select('id, name, username, avatar_url')
        .in('id', following);

      // Get outfits from followed users
      const { data: outfitsData } = await supabase
        .from('fits')
        .select('id, user_id, render_path, image_preview, title')
        .in('user_id', following)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get brands that might be followed (check if any following IDs match brand IDs)
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, slug, logo_url')
        .in('id', following);

      // Get products from followed brands
      let brandProducts: any[] = [];
      if (brandsData?.length) {
        const brandIds = brandsData.map(b => b.id);
        const { data: productsData } = await supabase
          .from('products')
          .select('id, brand_id, title, media_urls, price_cents, currency')
          .in('brand_id', brandIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);
        brandProducts = productsData || [];
      }

      // Group outfits by user
      const userOutfitsMap = new Map<string, typeof outfitsData>();
      outfitsData?.forEach((outfit) => {
        const existing = userOutfitsMap.get(outfit.user_id) || [];
        if (existing.length < 6) {
          existing.push(outfit);
          userOutfitsMap.set(outfit.user_id, existing);
        }
      });

      // Group products by brand
      const brandProductsMap = new Map<string, typeof brandProducts>();
      brandProducts.forEach((product) => {
        const existing = brandProductsMap.get(product.brand_id) || [];
        if (existing.length < 6) {
          existing.push(product);
          brandProductsMap.set(product.brand_id, existing);
        }
      });

      return {
        users: (usersData || []).map((u: any) => ({
          ...u,
          display_name: getDisplayName(u),
          outfits: userOutfitsMap.get(u.id) || [],
        })).filter((u: any) => u.outfits.length > 0),
        brands: (brandsData || []).map((b: any) => ({
          ...b,
          products: brandProductsMap.get(b.id) || [],
        })).filter(b => b.products.length > 0),
      };
    },
    enabled: !!following?.length,
  });

  if (followingLoading || isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-48 w-36 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!following?.length || (!followedContent?.users?.length && !followedContent?.brands?.length)) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No followed content yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Follow brands and shoppers to see their latest updates here.
        </p>
        <Button onClick={() => navigate('/explore?tab=brands')}>
          Discover Brands & Shoppers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Friend Styling Tip */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Palette className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> You can style friends using their own clothes.{' '}
            <button 
              onClick={() => navigate('/dress-me/canvas?mode=friends')}
              className="text-primary hover:underline font-medium"
            >
              Try it now →
            </button>
          </p>
        </CardContent>
      </Card>

      {/* Followed Brands */}
      {followedContent.brands.map((brand: any) => (
        <HorizontalCarousel
          key={`brand-${brand.id}`}
          title={brand.name}
          subtitle="New from brand"
          onViewMore={() => navigate(`/brand/${brand.slug}`)}
        >
          {/* Brand Logo Card */}
          <Card
            className="flex-shrink-0 w-24 h-48 cursor-pointer hover:shadow-lg transition-shadow snap-start"
            onClick={() => navigate(`/brand/${brand.slug}`)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <Avatar className="h-16 w-16 mb-3">
                <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                <AvatarFallback className="text-lg font-semibold">
                  {brand.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-center text-muted-foreground line-clamp-2">
                View All
              </p>
            </CardContent>
          </Card>

          {/* Product Cards */}
          {brand.products.map((product: any) => (
            <Card
              key={product.id}
              className="flex-shrink-0 w-36 flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 snap-start"
              onClick={() => navigate(`/p/${product.id}`)}
            >
              <div className="aspect-[3/4] relative overflow-hidden flex-shrink-0">
                <SmartImage
                  src={getPrimaryImageUrl(product)}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  sizes="144px"
                />
              </div>
              <CardContent className="p-2 bg-card">
                <p className="text-xs line-clamp-1 font-medium">{product.title}</p>
                <p className="text-xs text-primary font-semibold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: product.currency || 'USD',
                  }).format(product.price_cents / 100)}
                </p>
              </CardContent>
            </Card>
          ))}
        </HorizontalCarousel>
      ))}

      {/* Followed Users */}
      {followedContent.users.map((shopper: any) => (
        <HorizontalCarousel
          key={`user-${shopper.id}`}
          title={shopper.display_name || 'Fashion Lover'}
          subtitle="New outfits"
          onViewMore={() => navigate(`/profile/${shopper.id}`)}
        >
          {/* User Avatar Card */}
          <Card
            className="flex-shrink-0 w-24 h-48 cursor-pointer hover:shadow-lg transition-shadow snap-start"
            onClick={() => navigate(`/profile/${shopper.id}`)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <Avatar className="h-16 w-16 mb-3">
                <AvatarImage src={shopper.avatar_url || undefined} alt={shopper.display_name || 'User'} />
                <AvatarFallback className="text-lg font-semibold">
                  {(shopper.display_name || 'U').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-center text-muted-foreground line-clamp-2">
                View Profile
              </p>
            </CardContent>
          </Card>

          {/* Outfit Cards */}
          {shopper.outfits.map((outfit: any) => (
            <Card
              key={outfit.id}
              className="flex-shrink-0 w-36 flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 snap-start"
              onClick={() => navigate(`/dress-me/outfit/${outfit.id}`)}
            >
              <div className="aspect-[3/4] relative overflow-hidden flex-shrink-0 bg-muted">
                <SmartImage
                  src={outfit.render_path || outfit.image_preview || '/placeholder.svg'}
                  alt={outfit.title || 'Outfit'}
                  className="w-full h-full object-cover"
                  sizes="144px"
                />
              </div>
              <CardContent className="p-2 bg-card">
                <p className="text-xs line-clamp-1 font-medium">
                  {outfit.title || 'Untitled Outfit'}
                </p>
              </CardContent>
            </Card>
          ))}
        </HorizontalCarousel>
      ))}
    </div>
  );
};

export default FollowingTab;
