import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

interface SimilarItemsGridProps {
  productId: string;
  onItemClick: (product: Product) => void;
}

interface SimilarResponse {
  items: Product[];
  nextCursor?: string;
}

const SimilarItemsGrid: React.FC<SimilarItemsGridProps> = ({ productId, onItemClick }) => {
  const { user } = useAuth();
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['similar-items', productId],
    queryFn: async ({ pageParam = 0 }): Promise<SimilarResponse> => {
      const { data: result, error } = await supabase.rpc('get_similar_products', {
        target_product_id: productId,
        limit_count: 12,
        offset_count: pageParam
      });

      if (error) throw error;

      return {
        items: result || [],
        nextCursor: result && result.length === 12 ? pageParam + 12 : undefined
      };
    },
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item, index) => (
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
                  {item.brand?.name || 'Unknown Brand'}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {formatPrice(item.price_cents, item.currency)}
                </p>
              </div>
            </CardContent>
          </Card>
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