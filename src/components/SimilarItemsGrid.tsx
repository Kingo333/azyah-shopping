import React, { useEffect } from 'react';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useInView } from 'react-intersection-observer';

interface SimilarItemsGridProps {
  productId: string;
  onItemClick: (product: Product) => void;
  layout?: 'grid' | 'list';
}

interface SimilarResponse {
  items: Product[];
  nextCursor?: number;
}

const SimilarItemsGrid: React.FC<SimilarItemsGridProps> = ({ productId, onItemClick, layout = 'grid' }) => {
  const { user } = useAuth();
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
      <div className={layout === 'list' ? "space-y-2" : "grid grid-cols-2 md:grid-cols-4 gap-3"}>
        {Array.from({ length: layout === 'list' ? 4 : 8 }).map((_, i) => (
          <div key={i} className={`animate-pulse ${layout === 'list' ? 'flex gap-3' : ''}`}>
            <div className={layout === 'list' ? "w-16 h-20 bg-muted rounded" : "aspect-[3/4] bg-muted rounded-lg mb-2"}></div>
            {layout === 'list' && (
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-2/3 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            )}
            {layout === 'grid' && (
              <>
                <div className="h-4 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </>
            )}
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
      <div className={layout === 'list' ? "space-y-2" : "grid grid-cols-2 md:grid-cols-4 gap-3"}>
        {items.map((item, index) => (
          layout === 'list' ? (
            // List Layout
            <div
              key={item.id}
              className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onItemClick(item)}
            >
              <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                <img
                  {...getResponsiveImageProps(
                    getPrimaryImageUrl(item),
                    "64px"
                  )}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2 mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-1">
                  {(item.brand as any)?.name || 'Unknown Brand'}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {formatPrice(item.price_cents, item.currency)}
                </p>
              </div>
            </div>
          ) : (
            // Grid Layout
            <Card 
              key={item.id} 
              className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
              onClick={() => onItemClick(item)}
            >
              <CardContent className="p-0">
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  <img
                    {...getResponsiveImageProps(
                      getPrimaryImageUrl(item),
                      "(max-width: 768px) 50vw, 25vw"
                    )}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-medium line-clamp-2 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-1">
                    {(item.brand as any)?.name || 'Unknown Brand'}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {formatPrice(item.price_cents, item.currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        ))}
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