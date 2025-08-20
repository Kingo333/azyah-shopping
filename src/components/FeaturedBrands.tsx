import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Package, TrendingUp, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';

interface FeaturedBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  cover_image_url: string;
  bio: string;
  website: string;
  stats: {
    products_count: number;
    total_likes: number;
    avg_price_cents: number;
    recent_activity: number;
  };
  recent_products: Array<{
    id: string;
    title: string;
    media_urls: any;
    price_cents: number;
    currency: string;
  }>;
}

interface FeaturedBrandsProps {
  limit?: number;
  showMore?: boolean;
}

const FeaturedBrands: React.FC<FeaturedBrandsProps> = ({ limit = 6, showMore = true }) => {
  const navigate = useNavigate();

  const { data: featuredBrands, isLoading } = useQuery({
    queryKey: ['featured-brands', limit],
    queryFn: async () => {
      // Get brands with their product data
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select(`
          id,
          name,
          slug,
          logo_url,
          cover_image_url,
          bio,
          website
        `)
        .limit(20); // Get more brands to calculate engagement

      if (brandsError) throw brandsError;

      const enrichedBrands = await Promise.all(
        brands.map(async (brand) => {
          // Get products for this brand
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
              id,
              title,
              price_cents,
              currency,
              media_urls,
              created_at
            `)
            .eq('brand_id', brand.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          if (productsError) throw productsError;

          // Get likes for this brand's products
          const productIds = products?.map(p => p.id) || [];
          const { count: totalLikes } = await supabase
            .from('likes')
            .select('id', { count: 'exact' })
            .in('product_id', productIds);

          // Calculate recent activity (last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const recentActivity = products?.filter(p => 
            new Date(p.created_at) > thirtyDaysAgo
          ).length || 0;

          // Calculate average price
          const avgPrice = products?.length 
            ? products.reduce((sum, p) => sum + p.price_cents, 0) / products.length
            : 0;

          const stats = {
            products_count: products?.length || 0,
            total_likes: totalLikes || 0,
            avg_price_cents: Math.round(avgPrice),
            recent_activity: recentActivity,
          };

          // Calculate engagement score for sorting
          const engagementScore = (
            stats.products_count * 5 +
            stats.total_likes * 2 +
            stats.recent_activity * 10
          );

          return {
            ...brand,
            stats,
            recent_products: products?.slice(0, 3) || [],
            engagementScore
          } as FeaturedBrand & { engagementScore: number };
        })
      );

      return enrichedBrands
        .filter(brand => brand.stats.products_count > 0)
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);
    }
  });

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  const getBrandBadge = (index: number) => {
    if (index < 3) return "default";
    return "secondary";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-16 h-16 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {featuredBrands?.map((brand, index) => (
          <Card 
            key={brand.id}
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => navigate(`/brand/${brand.slug}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={getBrandBadge(index)}>
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
                {brand.stats.recent_activity > 0 && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    Active
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={brand.logo_url} />
                  <AvatarFallback>{brand.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {brand.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {brand.bio || 'Fashion brand'}
                  </p>
                </div>
                {brand.website && (
                  <ExternalLink 
                    className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(brand.website, '_blank');
                    }}
                  />
                )}
              </div>

              {brand.recent_products.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {brand.recent_products.map((product) => {
                    // Handle different media_urls formats
                    let imageUrl = '/placeholder.svg';
                    
                    if (product.media_urls) {
                      // If it's a JSON string, parse it
                      if (typeof product.media_urls === 'string') {
                        try {
                          const parsed = JSON.parse(product.media_urls);
                          imageUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                        } catch {
                          imageUrl = product.media_urls;
                        }
                      }
                      // If it's already an array
                      else if (Array.isArray(product.media_urls)) {
                        imageUrl = product.media_urls[0];
                      }
                    }
                    
                    const imageProps = imageUrl.includes('asos-media.com') 
                      ? getResponsiveImageProps(imageUrl, "(max-width: 768px) 64px, 64px")
                      : { src: imageUrl };
                    
                    return (
                      <div key={product.id} className="relative">
                        <img
                          {...imageProps}
                          alt={product.title}
                          className="w-16 h-16 object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">
                    {brand.stats.products_count} products
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <div className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    <span className="text-xs text-primary font-medium">
                      View Brand
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showMore && featuredBrands && featuredBrands.length > 0 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/featured-brands')}
            className="hover:bg-primary hover:text-primary-foreground"
          >
            View All Featured Brands
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default FeaturedBrands;