import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopProduct {
  id: string;
  title: string;
  swipe_appearances: number;
  right_swipes: number;
  wishlist_adds: number;
  likes: number;
  engagement_rate: number;
}

export const useTopProducts = (brandId?: string, retailerId?: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['top-products', brandId, retailerId, limit],
    queryFn: async (): Promise<TopProduct[]> => {
      console.log('Fetching top products for:', { brandId, retailerId, limit });
      
      // Get products for the brand/retailer
      let productsQuery = supabase
        .from('products')
        .select('id, title, image_url')
        .eq('status', 'active');

      if (brandId) {
        productsQuery = productsQuery.eq('brand_id', brandId);
      } else if (retailerId) {
        productsQuery = productsQuery.eq('retailer_id', retailerId);
      }

      const { data: products, error: productsError } = await productsQuery;
      
      if (productsError) {
        console.error('Error fetching products:', productsError);
        return [];
      }

      if (!products || products.length === 0) {
        console.log('No products found');
        return [];
      }

      console.log('Found products:', products.length);

      // Get analytics data for each product from swipes table
      const productAnalytics = await Promise.all(
        products.map(async (product) => {
          // Get swipes for this product (last 30 days)
          const { data: swipes } = await supabase
            .from('swipes')
            .select('action')
            .eq('product_id', product.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          // Get likes for this product
          const { data: likes } = await supabase
            .from('likes')
            .select('id')
            .eq('product_id', product.id);

          // Get wishlist adds for this product
          const { data: wishlistAdds } = await supabase
            .from('wishlist_items')
            .select('id')
            .eq('product_id', product.id)
            .gte('added_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          const swipeAppearances = swipes?.length || 0;
          const rightSwipes = swipes?.filter(s => s.action === 'right').length || 0;
          const likesCount = likes?.length || 0;
          const wishlistCount = wishlistAdds?.length || 0;
          
          // Engagement rate = (right swipes + wishlist adds) / total appearances
          const engagementRate = swipeAppearances > 0 
            ? ((rightSwipes + wishlistCount) / swipeAppearances) * 100 
            : 0;

          return {
            id: product.id,
            title: product.title,
            swipe_appearances: swipeAppearances,
            right_swipes: rightSwipes,
            wishlist_adds: wishlistCount,
            likes: likesCount,
            engagement_rate: engagementRate
          };
        })
      );

      // Sort by swipe appearances and engagement, then limit
      const topProducts = productAnalytics
        .sort((a, b) => {
          // Primary sort: swipe appearances (descending)
          if (b.swipe_appearances !== a.swipe_appearances) return b.swipe_appearances - a.swipe_appearances;
          // Secondary sort: engagement rate (descending)
          return b.engagement_rate - a.engagement_rate;
        })
        .slice(0, limit);

      console.log('Top products analytics:', topProducts);
      return topProducts;
    },
    enabled: !!(brandId || retailerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
};
