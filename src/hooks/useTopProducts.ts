import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopProduct {
  id: string;
  title: string;
  views: number;
  likes: number;
  wishlist_adds: number;
  clicks: number;
  est_revenue: number;
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

      // Get analytics data for each product
      const productAnalytics = await Promise.all(
        products.map(async (product) => {
          // Get events for this product
          const { data: events } = await supabase
            .from('events')
            .select('event_type')
            .eq('product_id', product.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

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

          const views = events?.filter(e => e.event_type === 'product_view').length || 0;
          const clicks = events?.filter(e => e.event_type === 'product_click').length || 0;
          const likesCount = likes?.length || 0;
          const wishlistCount = wishlistAdds?.length || 0;
          
          const engagementRate = views > 0 ? ((likesCount + clicks) / views) * 100 : 0;
          const estRevenue = clicks * 45; // $45 average per click

          return {
            id: product.id,
            title: product.title,
            views,
            likes: likesCount,
            wishlist_adds: wishlistCount,
            clicks,
            est_revenue: estRevenue,
            engagement_rate: engagementRate
          };
        })
      );

      // Sort by views and engagement, then limit
      const topProducts = productAnalytics
        .sort((a, b) => {
          // Primary sort: views (descending)
          if (b.views !== a.views) return b.views - a.views;
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