
import React, { useEffect, useCallback } from 'react';
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
import { upgradeAsosImageUrl, getResponsiveImageProps } from '@/utils/asosImageUtils';

interface TrendingProduct {
  id: string;
  title: string;
  image_url: string;
  price_cents: number;
  currency: string;
  brand_name: string;
  external_url: string | null;
}

interface TrendingStylesCarouselProps {
  limit?: number;
}

const TrendingStylesCarousel: React.FC<TrendingStylesCarouselProps> = ({ limit = 8 }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [api, setApi] = React.useState<any>();

  const { data: trendingProducts, isLoading, error } = useQuery({
    queryKey: ['trending-products-carousel', limit],
    queryFn: async (): Promise<TrendingProduct[]> => {
      console.log('TrendingProductsCarousel: Starting direct product fetch');
      
      // Direct query to products table
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          image_url,
          price_cents,
          currency,
          brands:brand_id(name),
          retailers:retailer_id(name)
        `)
        .eq('status', 'active')
        .not('title', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('TrendingProductsCarousel: Error fetching products:', error);
        throw error;
      }
      
      console.log('TrendingProductsCarousel: Products fetched:', data?.length || 0);
      return (data || []).map((product: any) => ({
        id: product.id,
        title: product.title,
        image_url: product.image_url || '/placeholder.svg',
        price_cents: product.price_cents,
        currency: product.currency || 'USD',
        brand_name: product.brands?.name || product.retailers?.name || 'ASOS',
        external_url: null
      }));
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  // Auto-slide functionality
  const scrollNext = useCallback(() => {
    if (api) api.scrollNext();
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const autoSlide = setInterval(() => {
      scrollNext();
    }, 4000); // Slide every 4 seconds

    // Pause auto-slide on hover
    const container = api.containerNode();
    if (container) {
      const handleMouseEnter = () => clearInterval(autoSlide);
      const handleMouseLeave = () => {
        clearInterval(autoSlide);
        const newAutoSlide = setInterval(scrollNext, 4000);
        return () => clearInterval(newAutoSlide);
      };

      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        clearInterval(autoSlide);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }

    return () => clearInterval(autoSlide);
  }, [api, scrollNext]);

  const getProductImage = (product: any) => {
    console.log('Product media data:', { image_url: product.image_url, media_urls: product.media_urls });
    
    // Try image_url first
    if (product.image_url) {
      return upgradeAsosImageUrl(product.image_url, 800);
    }
    
    // Then try media_urls array
    if (product.media_urls && Array.isArray(product.media_urls) && product.media_urls.length > 0) {
      const firstMedia = product.media_urls[0];
      console.log('First media item:', firstMedia, 'Type:', typeof firstMedia);
      
      if (typeof firstMedia === 'string') {
        return upgradeAsosImageUrl(firstMedia, 800);
      } else if (firstMedia && typeof firstMedia === 'object') {
        // Try different possible properties
        if (firstMedia.url) return upgradeAsosImageUrl(firstMedia.url, 800);
        if (firstMedia.src) return upgradeAsosImageUrl(firstMedia.src, 800);
        if (firstMedia.href) return upgradeAsosImageUrl(firstMedia.href, 800);
        // If it's an array within array, get the first string
        if (Array.isArray(firstMedia) && firstMedia.length > 0) {
          return upgradeAsosImageUrl(firstMedia[0], 800);
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
      
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existingLike) {
        // Move to top by updating created_at
        const { error } = await supabase
          .from('likes')
          .update({ created_at: new Date().toISOString() })
          .eq('id', existingLike.id);
        
        if (error) throw error;
        return { moved: true };
      } else {
        // Add new like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            product_id: productId
          });

        if (error) throw error;
        return { moved: false };
      }
    },
    onSuccess: (data) => {
      if (data.moved) {
        toast({
          title: "Moved to top",
          description: "Item moved to the top of your likes."
        });
      } else {
        toast({
          title: "Added to likes",
          description: "Item has been added to your likes."
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update likes.",
        variant: "destructive"
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

      // Check if already in wishlist
      const { data: existingItem } = await supabase
        .from('wishlist_items')
        .select('id, added_at')
        .eq('wishlist_id', wishlistId)
        .eq('product_id', productId)
        .single();

      if (existingItem) {
        // Move to top by updating added_at and sort_order
        const { error } = await supabase
          .from('wishlist_items')
          .update({ 
            added_at: new Date().toISOString(),
            sort_order: 0 
          })
          .eq('id', existingItem.id);
        
        if (error) throw error;
        
        // Update sort_order for other items to maintain order
        const { data: otherItems } = await supabase
          .from('wishlist_items')
          .select('id, sort_order')
          .eq('wishlist_id', wishlistId)
          .neq('id', existingItem.id);

        if (otherItems) {
          for (const item of otherItems) {
            await supabase
              .from('wishlist_items')
              .update({ sort_order: (item.sort_order || 0) + 1 })
              .eq('id', item.id);
          }
        }
        
        return { moved: true };
      } else {
        // Add new item at the top
        const { error } = await supabase
          .from('wishlist_items')
          .insert({
            wishlist_id: wishlistId,
            product_id: productId,
            sort_order: 0
          });

        if (error) throw error;
        
        // Update sort_order for existing items
        const { data: existingItems } = await supabase
          .from('wishlist_items')
          .select('id, sort_order')
          .eq('wishlist_id', wishlistId)
          .neq('product_id', productId);

        if (existingItems) {
          for (const item of existingItems) {
            await supabase
              .from('wishlist_items')
              .update({ sort_order: (item.sort_order || 0) + 1 })
              .eq('id', item.id);
          }
        }
        
        return { moved: false };
      }
    },
    onSuccess: (data) => {
      if (data.moved) {
        toast({
          title: "Moved to top",
          description: "Item moved to the top of your wishlist."
        });
      } else {
        toast({
          title: "Added to wishlist",
          description: "Item has been added to your wishlist."
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update wishlist.",
        variant: "destructive"
      });
    }
  });

  const handleShopNow = (externalUrl: string | null) => {
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

  console.log('TrendingProductsCarousel render:', { 
    isLoading, 
    error, 
    productsCount: trendingProducts?.length,
    user: user ? 'authenticated' : 'anonymous'
  });

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

  if (error) {
    console.error('TrendingProductsCarousel error:', error);
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Error loading products. Please try again.</p>
        <p className="text-sm text-red-500">{error.message}</p>
      </div>
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
    <Carousel 
      className="w-full" 
      opts={{ align: "start", loop: true }} 
      setApi={setApi}
    >
      <CarouselContent className="-ml-4 md:-ml-8">
        {trendingProducts.map((product, index) => (
          <CarouselItem key={product.id} className="pl-4 md:pl-8 basis-1/2 md:basis-1/2">
            <div className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              {/* Trending Badge */}
              <div className="absolute top-2 left-2 z-10">
                <Badge variant={index < 3 ? "default" : "secondary"} className="text-[10px] px-1.5 py-0.5">
                  #{index + 1} Trending
                </Badge>
              </div>

              <div 
                className="w-full aspect-[3/4] bg-muted rounded-2xl overflow-hidden relative cursor-pointer"
              >
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Top-right action buttons */}
                <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToLikesMutation.mutate(product.id);
                    }}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToWishlistMutation.mutate(product.id);
                    }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Product Info Overlay (appears on hover) */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-xs text-muted-foreground mb-1">
                    {product.brand_name || 'ASOS'}
                  </div>
                  <div className="text-xs font-semibold text-primary mb-3">
                    {formatPrice(product.price_cents, product.currency)}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShopNow(product.external_url);
                      }}
                      className="flex-1 text-xs h-8"
                    >
                      Shop Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-6" />
      <CarouselNext className="-right-6" />
    </Carousel>
  );
};

export default TrendingStylesCarousel;
