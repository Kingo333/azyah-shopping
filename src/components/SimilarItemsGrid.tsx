import React, { useEffect } from 'react';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useInView } from 'react-intersection-observer';
import SimilarItemCard from './SimilarItemCard';

interface SimilarItemsGridProps {
  productId: string;
  onItemClick: (product: Product) => void; // For main click (PhotoCloseup)
  onItemDetail?: (product: Product) => void; // For info button (ProductDetailPage)
}

interface SimilarResponse {
  items: Product[];
  nextCursor?: number;
}

const SimilarItemsGrid: React.FC<SimilarItemsGridProps> = ({ productId, onItemClick, onItemDetail }) => {
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
          description,
          price_cents,
          currency,
          brand_id,
          category_slug,
          subcategory_slug,
          media_urls,
          image_url,
          external_url,
          sku,
          merchant_name,
          compare_at_price_cents,
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-h-[400px] md:max-h-[500px] overflow-y-auto">
        {items.map((item, index) => (
          <SimilarItemCard
            key={item.id}
            item={item}
            onItemClick={onItemClick}
            onItemDetail={onItemDetail}
            formatPrice={formatPrice}
          />
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