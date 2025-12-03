
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsMetrics {
  totalSwipeAppearances: number;
  totalLikes: number;
  totalWishlistAdds: number;
  engagementRate: number;
  topReferrers: Array<{
    code: string;
    clicks: number;
  }>;
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

export interface AnalyticsOverview {
  swipe_appearances: number;
  right_swipes: number;
  wishlist_swipes: number;
  likes: number;
  engagement_rate: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

// Main analytics hook for brand/retailer specific metrics
export const useAnalytics = (entityId: string | undefined, entityType: 'brand' | 'retailer') => {
  return useQuery({
    queryKey: ['analytics', entityId, entityType],
    queryFn: async (): Promise<AnalyticsMetrics> => {
      if (!entityId) throw new Error('Entity ID required');

      console.log('Fetching analytics for:', entityType, entityId);

      // Get products for this entity
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq(entityType === 'brand' ? 'brand_id' : 'retailer_id', entityId)
        .eq('status', 'active');

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }

      const productIds = products?.map(p => p.id) || [];
      console.log('Product IDs found:', productIds.length);

      if (productIds.length === 0) {
        return {
          totalSwipeAppearances: 0,
          totalLikes: 0,
          totalWishlistAdds: 0,
          engagementRate: 0,
          topReferrers: []
        };
      }

      // Get swipe data - this is where products appeared in swipe mode
      const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('action')
        .in('product_id', productIds);

      if (swipesError) console.error('Error fetching swipes:', swipesError);

      // Get likes for these products
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('*')
        .in('product_id', productIds);

      if (likesError) console.error('Error fetching likes:', likesError);

      // Get wishlist adds for these products
      const { data: wishlistItems, error: wishlistError } = await supabase
        .from('wishlist_items')
        .select('*')
        .in('product_id', productIds);

      if (wishlistError) console.error('Error fetching wishlist items:', wishlistError);

      const totalSwipeAppearances = swipes?.length || 0;
      const rightSwipes = swipes?.filter(s => s.action === 'right').length || 0;
      const totalLikes = likes?.length || 0;
      const totalWishlistAdds = wishlistItems?.length || 0;

      // Calculate engagement rate (right swipes + wishlist / total appearances)
      const engagementRate = totalSwipeAppearances > 0 
        ? ((rightSwipes + totalWishlistAdds) / totalSwipeAppearances) * 100 
        : 0;

      console.log('Analytics computed:', {
        totalSwipeAppearances,
        totalLikes,
        totalWishlistAdds,
        engagementRate
      });

      return {
        totalSwipeAppearances,
        totalLikes,
        totalWishlistAdds,
        engagementRate: Math.round(engagementRate * 100) / 100,
        topReferrers: []
      };
    },
    enabled: !!entityId,
    refetchInterval: 30000
  });
};

// Analytics overview hook with swipe data
export const useAnalyticsOverview = (params: {
  startDate: string;
  endDate: string;
  brandId?: string;
  retailerId?: string;
}) => {
  return useQuery({
    queryKey: ['analytics-overview', params.startDate, params.endDate, params.brandId, params.retailerId],
    queryFn: async (): Promise<AnalyticsOverview> => {
      const { startDate, endDate, brandId, retailerId } = params;
      
      console.log('useAnalyticsOverview queryFn executing with:', { startDate, endDate, brandId, retailerId });
      
      // Get products for filtering
      let productIds: string[] = [];
      
      if (brandId || retailerId) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id')
          .eq(brandId ? 'brand_id' : 'retailer_id', brandId || retailerId)
          .eq('status', 'active');
        
        if (productsError) {
          console.error('Error fetching products:', productsError);
          return {
            swipe_appearances: 0,
            right_swipes: 0,
            wishlist_swipes: 0,
            likes: 0,
            engagement_rate: 0
          };
        }
        
        productIds = products?.map(p => p.id) || [];
        console.log('Product IDs found for filtering:', productIds.length);
      }

      if (productIds.length === 0) {
        return {
          swipe_appearances: 0,
          right_swipes: 0,
          wishlist_swipes: 0,
          likes: 0,
          engagement_rate: 0
        };
      }

      // Get swipes data - all swipe actions represent product appearances
      const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('action, created_at')
        .in('product_id', productIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (swipesError) {
        console.error('Error fetching swipes:', swipesError);
      }

      // Get likes in date range
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('id')
        .in('product_id', productIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (likesError) {
        console.error('Error fetching likes:', likesError);
      }

      // Get wishlist adds in date range
      const { data: wishlistAdds, error: wishlistError } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .in('product_id', productIds)
        .gte('added_at', startDate)
        .lte('added_at', endDate);
      
      if (wishlistError) {
        console.error('Error fetching wishlist adds:', wishlistError);
      }

      const swipeAppearances = swipes?.length || 0;
      const rightSwipes = swipes?.filter(s => s.action === 'right').length || 0;
      const wishlistSwipes = swipes?.filter(s => s.action === 'up').length || 0;
      const likesCount = likes?.length || 0;
      
      const engagementRate = swipeAppearances > 0 
        ? ((rightSwipes + wishlistSwipes) / swipeAppearances) * 100 
        : 0;
      
      const result = {
        swipe_appearances: swipeAppearances,
        right_swipes: rightSwipes,
        wishlist_swipes: wishlistSwipes,
        likes: likesCount,
        engagement_rate: Math.round(engagementRate * 100) / 100
      };
      
      console.log('useAnalyticsOverview queryFn returning result:', result);
      
      return result;
    },
    enabled: !!(params.startDate && params.endDate),
    staleTime: 30000,
    refetchInterval: false,
    retry: 1
  });
};

// Conversion funnel based on swipe interactions
export const useConversionFunnel = (params: {
  startDate: string;
  endDate: string;
  brandId?: string;
  retailerId?: string;
}) => {
  return useQuery({
    queryKey: ['conversion-funnel', params.startDate, params.endDate, params.brandId, params.retailerId],
    queryFn: async (): Promise<ConversionFunnelData[]> => {
      const { startDate, endDate, brandId, retailerId } = params;
      
      // Get products for filtering
      let productIds: string[] = [];
      
      if (brandId || retailerId) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id')
          .eq(brandId ? 'brand_id' : 'retailer_id', brandId || retailerId)
          .eq('status', 'active');
        
        if (productsError) {
          console.error('Error fetching products for funnel:', productsError);
          return [];
        }
        
        productIds = products?.map(p => p.id) || [];
      }

      if (productIds.length === 0) {
        return [];
      }

      // Get swipes data
      const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('action')
        .in('product_id', productIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (swipesError) {
        console.error('Error fetching swipes for funnel:', swipesError);
        return [];
      }

      // Get wishlist data
      const { data: wishlistAdds, error: wishlistError } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .in('product_id', productIds)
        .gte('added_at', startDate)
        .lte('added_at', endDate);
      
      if (wishlistError) {
        console.error('Error fetching wishlist for funnel:', wishlistError);
      }

      // Get likes data
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('id')
        .in('product_id', productIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (likesError) {
        console.error('Error fetching likes for funnel:', likesError);
      }

      const swipeAppearances = swipes?.length || 0;
      const rightSwipes = swipes?.filter(s => s.action === 'right').length || 0;
      const wishlistSwipes = swipes?.filter(s => s.action === 'up').length || 0;
      const wishlistCount = wishlistAdds?.length || 0;
      const likesCount = likes?.length || 0;

      // Build funnel stages
      const stages = [
        { stage: 'Swipe Appearances', count: swipeAppearances, percentage: 100 },
        { stage: 'Right Swipes (Likes)', count: rightSwipes, percentage: swipeAppearances > 0 ? (rightSwipes / swipeAppearances) * 100 : 0 },
        { stage: 'Wishlist Saves', count: wishlistCount, percentage: swipeAppearances > 0 ? (wishlistCount / swipeAppearances) * 100 : 0 },
        { stage: 'Saved to Likes', count: likesCount, percentage: swipeAppearances > 0 ? (likesCount / swipeAppearances) * 100 : 0 }
      ];

      // Calculate conversion rates between stages
      const result = stages.map((stage, index) => ({
        ...stage,
        conversion_rate: index === 0 ? 100 : stages[index - 1].count > 0 ? (stage.count / stages[index - 1].count) * 100 : 0
      }));
      
      console.log('Conversion funnel result:', result);
      return result;
    },
    enabled: !!(params.startDate && params.endDate),
    staleTime: 30000,
    refetchInterval: false,
    retry: 1
  });
};

// Time series analytics with swipe data
export const useTimeSeriesAnalytics = (
  metric: 'swipes' | 'likes' | 'wishlists',
  interval: 'day' | 'week' | 'month',
  dateFilter: { startDate: string; endDate: string },
  entityId?: string,
  entityType?: 'brand' | 'retailer'
) => {
  return useQuery({
    queryKey: ['time-series', metric, interval, dateFilter.startDate, dateFilter.endDate, entityId, entityType],
    queryFn: async () => {
      // Get products for filtering if entity specified
      let productIds: string[] = [];
      
      if (entityId && entityType) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id')
          .eq(entityType === 'brand' ? 'brand_id' : 'retailer_id', entityId)
          .eq('status', 'active');
        
        if (productsError) {
          console.error('Error fetching products for time series:', productsError);
          return [];
        }
        
        productIds = products?.map(p => p.id) || [];
      }

      if (productIds.length === 0) {
        return [];
      }

      // Initialize date groups
      const dateGroups: Record<string, number> = {};
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dateGroups[dateKey] = 0;
      }

      if (metric === 'swipes') {
        // Get swipes data
        const { data: swipes, error: swipesError } = await supabase
          .from('swipes')
          .select('created_at')
          .in('product_id', productIds)
          .gte('created_at', dateFilter.startDate)
          .lte('created_at', dateFilter.endDate);

        if (swipesError) {
          console.error('Error fetching swipes for time series:', swipesError);
          return [];
        }

        swipes?.forEach(swipe => {
          const dateKey = new Date(swipe.created_at).toISOString().split('T')[0];
          if (dateGroups.hasOwnProperty(dateKey)) {
            dateGroups[dateKey]++;
          }
        });
      } else if (metric === 'likes') {
        // Get likes data
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select('created_at')
          .in('product_id', productIds)
          .gte('created_at', dateFilter.startDate)
          .lte('created_at', dateFilter.endDate);

        if (likesError) {
          console.error('Error fetching likes for time series:', likesError);
          return [];
        }

        likes?.forEach(like => {
          const dateKey = new Date(like.created_at).toISOString().split('T')[0];
          if (dateGroups.hasOwnProperty(dateKey)) {
            dateGroups[dateKey]++;
          }
        });
      } else if (metric === 'wishlists') {
        // Get wishlist data
        const { data: wishlists, error: wishlistError } = await supabase
          .from('wishlist_items')
          .select('added_at')
          .in('product_id', productIds)
          .gte('added_at', dateFilter.startDate)
          .lte('added_at', dateFilter.endDate);

        if (wishlistError) {
          console.error('Error fetching wishlists for time series:', wishlistError);
          return [];
        }

        wishlists?.forEach(item => {
          const dateKey = new Date(item.added_at).toISOString().split('T')[0];
          if (dateGroups.hasOwnProperty(dateKey)) {
            dateGroups[dateKey]++;
          }
        });
      }

      // Convert to array format
      const result = Object.entries(dateGroups).map(([date, value]) => ({
        date,
        value
      }));
      
      console.log('Time series result for', metric, ':', result.length, 'data points');
      return result;
    },
    enabled: !!(dateFilter.startDate && dateFilter.endDate),
    staleTime: 30000,
    refetchInterval: false,
    retry: 1
  });
};

// Product analytics hook for tracking user interactions (no changes needed - doesn't affect swipe mechanics)
export const useProductAnalytics = () => {
  const trackProductView = async (productId: string, context: string) => {
    console.log('Tracking product view:', productId, context);
    
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'product_view',
          product_id: productId,
          event_data: { context },
          session_id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error tracking product view:', error);
      }
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  };

  const trackProductClick = async (productId: string, context: string) => {
    console.log('Tracking product click:', productId, context);
    
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'product_click',
          product_id: productId,
          event_data: { context },
          session_id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error tracking product click:', error);
      }
    } catch (error) {
      console.error('Error tracking product click:', error);
    }
  };

  const trackWishlistAdd = async (productId: string) => {
    console.log('Tracking wishlist add:', productId);
    
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'wishlist_add',
          product_id: productId,
          session_id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error tracking wishlist add:', error);
      }
    } catch (error) {
      console.error('Error tracking wishlist add:', error);
    }
  };

  const trackAddToCart = async (productId: string, size?: string, color?: string) => {
    console.log('Tracking add to cart:', productId, { size, color });
    
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'add_to_cart',
          product_id: productId,
          event_data: { size, color },
          session_id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error tracking add to cart:', error);
      }
    } catch (error) {
      console.error('Error tracking add to cart:', error);
    }
  };

  return {
    trackProductView,
    trackProductClick,
    trackWishlistAdd,
    trackAddToCart
  };
};
