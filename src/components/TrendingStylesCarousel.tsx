
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { TrendingUp, Heart, ShoppingBag, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TrendingProduct {
  id: string;
  title: string;
  image_url: string;
  price_cents: number;
  currency: string;
  brand_name: string;
  external_url: string;
}

interface TrendingStylesCarouselProps {
  limit?: number;
}

const TrendingStylesCarousel: React.FC<TrendingStylesCarouselProps> = ({ limit = 8 }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: trendingProducts, isLoading } = useQuery({
    queryKey: ['trending-products-carousel', limit],
    queryFn: async () => {
      // First try to get products with actual likes
      const { data: likedProducts, error: likesError } = await supabase
        .from('likes')
        .select(`
          product_id,
          products!inner(
            id,
            title,
            image_url,
            media_urls,
            price_cents,
            currency,
            external_url,
            brands!inner(name)
          )
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .eq('products.status', 'active')
        .not('products.brand_id', 'is', null);

      if (!likesError && likedProducts && likedProducts.length > 0) {
        // Group by product and count likes
        const productLikes = new Map();
        likedProducts.forEach((like: any) => {
          const productId = like.product_id;
          if (productLikes.has(productId)) {
            productLikes.get(productId).count += 1;
          } else {
            productLikes.set(productId, {
              count: 1,
              product: like.products
            });
          }
        });

        // Sort by like count
        const sortedByLikes = Array.from(productLikes.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map(item => ({
            id: item.product.id,
            title: item.product.title,
            image_url: getProductImage(item.product),
            price_cents: item.product.price_cents,
            currency: item.product.currency || 'USD',
            brand_name: item.product.brands?.name || 'Unknown Brand',
            external_url: item.product.external_url,
            like_count: item.count
          }));

        if (sortedByLikes.length > 0) {
          console.log('Found trending products by likes:', sortedByLikes);
          return sortedByLikes;
        }
      }

      // Fallback to swipes if no likes data
      const { data: trendingData, error: trendingError } = await supabase
        .from('swipes')
        .select(`
          product_id,
          products!inner(
            id,
            title,
            image_url,
            media_urls,
            price_cents,
            currency,
            external_url,
            brands!inner(name)
          )
        `)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .eq('action', 'right') // Only right swipes (likes)
        .eq('products.status', 'active')
        .not('products.brand_id', 'is', null);

      if (trendingError) {
        console.error('Error fetching trending products:', trendingError);
        // Fallback to recent products
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select(`
            id,
            title,
            image_url,
            media_urls,
            price_cents,
            currency,
            external_url,
            brand:brands(name)
          `)
          .eq('status', 'active')
          .not('brand_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fallbackError || !fallbackData) return [];
        
        console.log('Using fallback products:', fallbackData.slice(0, 3));
        return fallbackData.map((product: any) => ({
          id: product.id,
          title: product.title,
          image_url: getProductImage(product),
          price_cents: product.price_cents,
          currency: product.currency || 'USD',
          brand_name: product.brand?.name || 'Unknown Brand',
          external_url: product.external_url
        }));
      }

      // Group by product and count swipes
      const productSwipes = new Map();
      trendingData?.forEach((swipe: any) => {
        const productId = swipe.product_id;
        if (productSwipes.has(productId)) {
          productSwipes.get(productId).count += 1;
        } else {
          productSwipes.set(productId, {
            count: 1,
            product: swipe.products
          });
        }
      });

      // Sort by swipe count and return top products
      const sortedProducts = Array.from(productSwipes.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(item => ({
          id: item.product.id,
          title: item.product.title,
          image_url: getProductImage(item.product),
          price_cents: item.product.price_cents,
          currency: item.product.currency || 'USD',
          brand_name: item.product.brands?.name || 'Unknown Brand',
          external_url: item.product.external_url,
          swipe_count: item.count
        }));

      console.log('Found trending products by swipes:', sortedProducts);

      return sortedProducts.length > 0 ? sortedProducts : [];
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  const getProductImage = (product: any) => {
    console.log('Product media data:', { image_url: product.image_url, media_urls: product.media_urls });
    
    // Try image_url first
    if (product.image_url) {
      return product.image_url;
    }
    
    // Then try media_urls array
    if (product.media_urls && Array.isArray(product.media_urls) && product.media_urls.length > 0) {
      const firstMedia = product.media_urls[0];
      console.log('First media item:', firstMedia, 'Type:', typeof firstMedia);
      
      if (typeof firstMedia === 'string') {
        return firstMedia;
      } else if (firstMedia && typeof firstMedia === 'object') {
        // Try different possible properties
        if (firstMedia.url) return firstMedia.url;
        if (firstMedia.src) return firstMedia.src;
        if (firstMedia.href) return firstMedia.href;
        // If it's an array within array, get the first string
        if (Array.isArray(firstMedia) && firstMedia.length > 0) {
          return firstMedia[0];
        }
      }
    }
    
    console.log('No valid image found, using placeholder');
    return '/placeholder.svg';
  };

  const formatProductTitle = (title: string) => {
    return title.length > 50 ? `${title.slice(0, 50)}...` : title;
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

      if (error && error.code !== '23505') throw error; // Ignore duplicate key error
    },
    onSuccess: () => {
      toast({
        title: "Added to likes",
        description: "Item has been added to your likes."
      });
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast({
          title: "Already liked",
          description: "This item is already in your likes.",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to likes.",
          variant: "destructive"
        });
      }
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

      if (error && error.code !== '23505') throw error; // Ignore duplicate key error
    },
    onSuccess: () => {
      toast({
        title: "Added to wishlist",
        description: "Item has been added to your wishlist."
      });
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast({
          title: "Already in wishlist",
          description: "This item is already in your wishlist.",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to wishlist.",
          variant: "destructive"
        });
      }
    }
  });

  const handleShopNow = (externalUrl: string) => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Shop link not available",
        description: "This product doesn't have a shop link available.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Carousel className="w-full">
        <CarouselContent>
          {[...Array(4)].map((_, i) => (
            <CarouselItem key={i} className="md:basis-1/2">
              <Card className="animate-pulse">
                <CardContent className="p-8">
                  <div className="h-6 bg-muted rounded mb-4"></div>
                  <div className="h-8 bg-muted rounded mb-6"></div>
                  <div className="grid grid-cols-2 gap-6">
                    {[...Array(2)].map((_, j) => (
                      <div key={j} className="aspect-square bg-muted rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    );
  }

  if (!trendingProducts || trendingProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No trending products available at the moment.</p>
      </div>
    );
  }

  return (
    <Carousel className="w-full" opts={{ align: "start", loop: false }}>
      <CarouselContent className="-ml-4 md:-ml-8">
        {trendingProducts.map((product, index) => (
          <CarouselItem key={product.id} className="pl-4 md:pl-8 basis-full md:basis-1/2">
            <Card className="group hover:shadow-xl transition-all duration-300 h-full">
              <CardContent className="p-6 md:p-8 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <Badge variant={index < 3 ? "default" : "secondary"} className="text-xs px-2 py-0.5">
                    #{index + 1} Trending
                  </Badge>
                  <div className="text-xs text-muted-foreground font-medium">
                    {product.brand_name}
                  </div>
                </div>

                {/* Product Image */}
                <div className="relative aspect-[4/3] mb-4 rounded-xl overflow-hidden bg-gray-50">
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  
                  {/* Action Buttons Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 w-9 p-0 bg-white/95 hover:bg-white hover:text-red-500 rounded-full shadow-lg border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToLikesMutation.mutate(product.id);
                        }}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 w-9 p-0 bg-white/95 hover:bg-white hover:text-blue-500 rounded-full shadow-lg border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToWishlistMutation.mutate(product.id);
                        }}
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col">
                  <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {formatProductTitle(product.title)}
                  </h4>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-base text-primary">
                      {formatPrice(product.price_cents, product.currency)}
                    </span>
                    
                    <Button
                      size="sm"
                      className="h-8 px-4 text-xs font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShopNow(product.external_url);
                      }}
                    >
                      Shop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-6" />
      <CarouselNext className="-right-6" />
    </Carousel>
  );
};

export default TrendingStylesCarousel;
