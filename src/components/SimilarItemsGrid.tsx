import React, { useEffect } from 'react';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Info, Image } from 'lucide-react';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/hooks/use-toast';
import { useInView } from 'react-intersection-observer';

interface SimilarItemsGridProps {
  productId: string;
  onItemClick: (product: Product) => void;
}

interface SimilarResponse {
  items: Product[];
  nextCursor?: number;
}

const SimilarItemsGrid: React.FC<SimilarItemsGridProps> = ({ productId, onItemClick }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery<SimilarResponse, Error, InfiniteData<SimilarResponse>, string[], number>({
    queryKey: ['similar-items', productId],
    queryFn: async ({ pageParam = 0 }): Promise<SimilarResponse> => {
      const { data: result, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          brand_id,
          category_slug,
          subcategory_slug,
          media_urls,
          image_url,
          external_url,
          brand:brands(*)
        `)
        .eq('status', 'active')
        .neq('id', productId)
        .range(pageParam as number, (pageParam as number) + 11);

      if (error) throw error;

      const products = result?.map(item => ({
        ...item,
        brand: item.brand ? { name: (item.brand as any).name } : null
      })) || [];

      return {
        items: products as Product[],
        nextCursor: products.length === 12 ? (pageParam as number) + 12 : undefined
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!productId,
  });

  // Fetch next page when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Track similar item impressions
  useEffect(() => {
    if (data?.pages && user) {
      const items = data.pages.flatMap(page => page.items);
      items.forEach((item, index) => {
        supabase.from('events').insert({
          user_id: user.id,
          event_type: 'similar_impression',
          event_data: { 
            position: index + 1,
            from_product_id: productId 
          },
          product_id: item.id
        });
      });
    }
  }, [data, user, productId]);

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-muted rounded-lg mb-2"></div>
            <div className="h-4 bg-muted rounded mb-1"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load similar items</p>
      </div>
    );
  }

  const items = data?.pages.flatMap(page => page.items) || [];

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No similar items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        {items.map((item, index) => {
          const { addToWishlist, isLoading: wishlistLoading } = useWishlist(item.id);

          const handleLike = async () => {
            if (!user) {
              toast({
                title: "Sign in required",
                description: "You must be signed in to like items.",
                variant: "destructive"
              });
              return;
            }

            try {
              const { error } = await supabase.from('likes').insert([{
                user_id: user.id,
                product_id: item.id
              }]);

              if (error && error.code !== '23505') {
                throw error;
              }

              toast({
                description: `${item.title} added to your likes!`
              });
            } catch (error: any) {
              console.error('Failed to like item:', error);
              toast({
                title: "Error",
                description: "Failed to like item. Please try again.",
                variant: "destructive"
              });
            }
          };

          const handleAddToWishlist = async () => {
            if (!user) {
              toast({
                title: "Sign in required",
                description: "You must be signed in to add to wishlist.",
                variant: "destructive"
              });
              return;
            }

            try {
              await addToWishlist(item.id);
              toast({
                description: `${item.title} added to your wishlist!`
              });
            } catch (error: any) {
              console.error('Failed to add to wishlist:', error);
              toast({
                title: "Error",
                description: error.message || "Failed to add to wishlist. Please try again.",
                variant: "destructive"
              });
            }
          };

          return (
            <div key={item.id} className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div 
                className="w-full aspect-[3/4] bg-muted rounded-2xl overflow-hidden relative cursor-pointer"
                onClick={() => onItemClick(item)}
              >
                <img
                  {...getResponsiveImageProps(
                    getPrimaryImageUrl(item),
                    "(max-width: 768px) 50vw, 25vw"
                  )}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                
                {/* Multiple images indicator */}
                {hasMultipleImages(item) && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-90">
                    <Image className="h-3 w-3" />
                    {getImageCount(item)}
                  </div>
                )}
                
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Top-right action buttons */}
                <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike();
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
                      handleAddToWishlist();
                    }}
                    disabled={wishlistLoading}
                  >
                    <ShoppingBag className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Product Info Overlay (appears on hover) */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-xs font-medium line-clamp-1 mb-1">
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {(item.brand as any)?.name || 'Unknown Brand'}
                  </div>
                  <div className="text-xs font-semibold text-primary mb-3">
                    {formatPrice(item.price_cents, item.currency)}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-full bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(item);
                      }}
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                    
                    {/* Shop Now button */}
                    {item.external_url && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.external_url, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex-1 text-xs h-8"
                      >
                        Shop Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more trigger */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          ) : (
            <div className="h-6"></div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimilarItemsGrid;