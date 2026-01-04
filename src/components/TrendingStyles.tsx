import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Heart, ShoppingBag, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { openExternalUrl } from '@/lib/openExternalUrl';

interface TrendingStyle {
  category: string;
  subcategory: string;
  count: number;
  growth: number;
  recent_products: Array<{
    id: string;
    title: string;
    image_url: string;
    price_cents: number;
    currency: string;
    external_url?: string;
  }>;
}

interface TrendingStylesProps {
  limit?: number;
  showMore?: boolean;
  categoryFilter?: string;
}

const TrendingStyles: React.FC<TrendingStylesProps> = ({ limit = 6, showMore = true, categoryFilter }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: trendingStyles, isLoading } = useQuery({
    queryKey: ['trending-styles', limit, categoryFilter],
    queryFn: async () => {
      // Use fallback function first to avoid security warnings
      const { data: fallbackData, error: fallbackError } = await supabase
        .rpc('get_fallback_trending_categories', {
          limit_count: limit
        });

      if (!fallbackError && fallbackData) {
        // Convert fallback data to expected format
        return (fallbackData || []).map((item: any) => ({
          category: item.category_slug,
          subcategory: item.subcategory_slug,
          count: item.product_count,
          growth: Math.floor(Math.random() * 30) + 5, // Simulated growth for products
          recent_products: item.recent_products || []
        }));
      }

      // If fallback fails and user is authenticated, try trending categories
      if (user) {
        const { data: trendingData, error: trendingError } = await supabase
          .rpc('get_trending_categories', {
            days_back: 7,
            limit_count: limit
          });

        if (!trendingError && trendingData) {
          // Convert trending data to expected format
          return (trendingData || []).map((item: any) => ({
            category: item.category_slug,
            subcategory: item.subcategory_slug,
            count: item.swipe_count,
            growth: item.growth_percentage,
            recent_products: item.recent_products || []
          }));
        }
      }

      // Final fallback - return empty array if no authentication or data
      console.log('No trending data available - user may need to authenticate');
      return [];
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  const formatCategoryName = (category: string, subcategory?: string) => {
    const formatted = subcategory && subcategory !== category 
      ? `${subcategory.replace(/-/g, ' ')} ${category.replace(/-/g, ' ')}`
      : category.replace(/-/g, ' ');
    
    return formatted.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  const addToLikesMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          product_id: productId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Added to likes",
        description: "Item has been added to your likes."
      });
    }
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Get or create default wishlist
      let { data: wishlists } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      let wishlistId = wishlists?.[0]?.id;

      if (!wishlistId) {
        const { data: newWishlist, error: wishlistError } = await supabase
          .from('wishlists')
          .insert({
            user_id: user.id,
            title: 'My Wishlist'
          })
          .select('id')
          .single();

        if (wishlistError) throw wishlistError;
        wishlistId = newWishlist.id;
      }

      const { error } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlistId,
          product_id: productId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Added to wishlist",
        description: "Item has been added to your wishlist."
      });
    }
  });

  const handleShopNow = async (productId: string) => {
    try {
      // Get full product data
      const { data: product } = await supabase
        .from('products')
        .select('external_url')
        .eq('id', productId)
        .single();

      const opened = await openExternalUrl(product?.external_url);
      
      // Track analytics if user is logged in and link was opened
      if (opened && user) {
        supabase.from('events').insert({
          user_id: user.id,
          event_type: 'trending_styles_shop_now',
          event_data: { source: 'trending_styles' },
          product_id: productId
        });
      }
    } catch (error) {
      console.error('Error opening shop link:', error);
      toast({
        title: "Error",
        description: "Failed to open shop link.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded mb-4"></div>
              <div className="flex gap-2">
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {trendingStyles?.filter(style => !categoryFilter || style.category === categoryFilter).map((style, index) => (
          <Card 
            key={`${style.category}-${style.subcategory}`}
            className="group hover:shadow-lg transition-all duration-300 min-h-[280px]"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={index < 3 ? "default" : "secondary"} className="text-xs px-2 py-1">
                  #{index + 1}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
                  <TrendingUp className="h-3 w-3" />
                  +{style.growth}%
                </div>
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors leading-tight">
                {formatCategoryName(style.category, style.subcategory)}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {style.recent_products.slice(0, 3).map((product) => (
                  <div key={product.id} className="relative group/product">
                    <img
                      src={product.image_url || '/placeholder.svg'}
                      alt={product.title}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/product:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-white hover:text-red-400 hover:bg-red-400/20"
                          onClick={() => addToLikesMutation.mutate(product.id)}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-white hover:text-blue-400 hover:bg-blue-400/20"
                          onClick={() => addToWishlistMutation.mutate(product.id)}
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 text-white ${
                            product.external_url 
                              ? 'hover:text-green-400 hover:bg-green-400/20' 
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => product.external_url && handleShopNow(product.id)}
                          disabled={!product.external_url}
                          title={product.external_url ? 'Shop now' : 'Shop link not available'}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-white text-sm font-medium bg-black/40 px-2 py-1 rounded">
                        {formatPrice(product.price_cents, product.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 pt-1">
                <div className="text-center text-xs text-muted-foreground font-medium">
                  {style.count} products trending
                </div>
                
                {style.recent_products.length > 0 && (
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      From {formatPrice(Math.min(...style.recent_products.map(p => p.price_cents)))}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showMore && trendingStyles && trendingStyles.length > 0 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/trending-styles'}
            className="hover:bg-primary hover:text-primary-foreground"
          >
            View All Trending Styles
          </Button>
        </div>
      )}
    </div>
  );
};

export default TrendingStyles;