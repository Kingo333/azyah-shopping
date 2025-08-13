
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsMetrics {
  totalViews: number;
  totalLikes: number;
  totalWishlistAdds: number;
  conversionRate: number;
  topReferrers: Array<{
    code: string;
    clicks: number;
    revenue: number;
  }>;
  repeatShopperRate: number;
  avgSwipeSentiment: number;
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

export interface AnalyticsOverview {
  impressions: number;
  clicks: number;
  ctr: number;
  wishlist_adds: number;
  conversions: number;
  revenue_cents: number;
  ar_views: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  revenue?: number;
  conversions?: number;
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
          totalViews: 0,
          totalLikes: 0,
          totalWishlistAdds: 0,
          conversionRate: 0,
          topReferrers: [],
          repeatShopperRate: 0,
          avgSwipeSentiment: 0
        };
      }

      // Get actual analytics data from events table
      const { data: viewEvents, error: viewError } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'product_view')
        .in('product_id', productIds);

      if (viewError) console.error('Error fetching view events:', viewError);

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

      // Get purchase events
      const { data: purchaseEvents, error: purchaseError } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'purchase')
        .in('product_id', productIds);

      if (purchaseError) console.error('Error fetching purchase events:', purchaseError);

      const totalViews = viewEvents?.length || 0;
      const totalLikes = likes?.length || 0;
      const totalWishlistAdds = wishlistItems?.length || 0;
      const totalPurchases = purchaseEvents?.length || 0;

      // Calculate conversion rate (purchases / views)
      const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

      console.log('Analytics computed:', {
        totalViews,
        totalLikes,
        totalWishlistAdds,
        totalPurchases,
        conversionRate
      });

      return {
        totalViews,
        totalLikes,
        totalWishlistAdds,
        conversionRate: Math.round(conversionRate * 100) / 100,
        topReferrers: [], // TODO: implement with affiliate tracking
        repeatShopperRate: 0, // TODO: implement with order analysis
        avgSwipeSentiment: 0 // TODO: implement with swipe analysis
      };
    },
    enabled: !!entityId,
    refetchInterval: 30000 // Refetch every 30 seconds for real-time data
  });
};

// Analytics overview hook with real data
export const useAnalyticsOverview = (params: {
  startDate: string;
  endDate: string;
  brandId?: string;
  retailerId?: string;
}) => {
  return useQuery({
    queryKey: ['analytics-overview', params],
    queryFn: async (): Promise<AnalyticsOverview> => {
      const { startDate, endDate, brandId, retailerId } = params;
      
      console.log('useAnalyticsOverview called with:', { startDate, endDate, brandId, retailerId });
      
      // Get products for filtering
      let productIds: string[] = [];
      
      if (brandId || retailerId) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq(brandId ? 'brand_id' : 'retailer_id', brandId || retailerId)
          .eq('status', 'active');
        
        productIds = products?.map(p => p.id) || [];
      }

      // Get events within date range, filter by brand/retailer directly
      let eventsQuery = supabase
        .from('events')
        .select('event_type, product_id, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Filter directly by brand_id or retailer_id if specified
      if (brandId) {
        eventsQuery = eventsQuery.eq('brand_id', brandId);
      } else if (retailerId) {
        eventsQuery = eventsQuery.eq('retailer_id', retailerId);
      }

      const { data: events, error: eventsError } = await eventsQuery;
      
      console.log('Events query result:', { 
        events: events?.length, 
        error: eventsError,
        brandId,
        retailerId,
        sampleEvents: events?.slice(0, 3)
      });

      const impressions = events?.filter(e => e.event_type === 'product_view').length || 0;
      const clicks = events?.filter(e => e.event_type === 'product_click').length || 0;
      const conversions = events?.filter(e => e.event_type === 'purchase').length || 0;
      const ar_views = events?.filter(e => e.event_type === 'ar_view').length || 0;

      // Get wishlist adds in date range
      let wishlistQuery = supabase
        .from('wishlist_items')
        .select('product_id')
        .gte('added_at', startDate)
        .lte('added_at', endDate);

      if (productIds.length > 0) {
        wishlistQuery = wishlistQuery.in('product_id', productIds);
      }

      const { data: wishlistAdds } = await wishlistQuery;

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      
      const result = {
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100,
        wishlist_adds: wishlistAdds?.length || 0,
        conversions,
        revenue_cents: conversions * 4500, // Estimated average order value
        ar_views
      };
      
      console.log('useAnalyticsOverview final result:', result);
      
      return result;
    },
    refetchInterval: 30000
  });
};

// Real conversion funnel data
export const useConversionFunnel = (params: {
  startDate: string;
  endDate: string;
  brandId?: string;
  retailerId?: string;
}) => {
  return useQuery({
    queryKey: ['conversion-funnel', params],
    queryFn: async (): Promise<ConversionFunnelData[]> => {
      const { startDate, endDate, brandId, retailerId } = params;
      
      // Get products for filtering
      let productIds: string[] = [];
      
      if (brandId || retailerId) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq(brandId ? 'brand_id' : 'retailer_id', brandId || retailerId)
          .eq('status', 'active');
        
        productIds = products?.map(p => p.id) || [];
      }

      // Get event counts
      const eventsQuery = supabase
        .from('events')
        .select('event_type')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (productIds.length > 0) {
        eventsQuery.in('product_id', productIds);
      }

      const { data: events } = await eventsQuery;

      const impressions = events?.filter(e => e.event_type === 'product_view').length || 0;
      const clicks = events?.filter(e => e.event_type === 'product_click').length || 0;
      const purchases = events?.filter(e => e.event_type === 'purchase').length || 0;

      // Get wishlist data
      const { data: wishlistAdds } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .gte('added_at', startDate)
        .lte('added_at', endDate)
        .in('product_id', productIds.length > 0 ? productIds : []);

      const wishlistCount = wishlistAdds?.length || 0;

      // Build funnel stages with clearer terminology
      const stages = [
        { stage: 'Product Views', count: impressions, percentage: 100 },
        { stage: 'External Store Clicks', count: clicks, percentage: impressions > 0 ? (clicks / impressions) * 100 : 0 },
        { stage: 'Wishlist Additions', count: wishlistCount, percentage: impressions > 0 ? (wishlistCount / impressions) * 100 : 0 },
        { stage: 'Tracked Conversions', count: purchases, percentage: impressions > 0 ? (purchases / impressions) * 100 : 0 }
      ];

      // Calculate conversion rates between stages
      return stages.map((stage, index) => ({
        ...stage,
        conversion_rate: index === 0 ? 100 : stages[index - 1].count > 0 ? (stage.count / stages[index - 1].count) * 100 : 0
      }));
    },
    refetchInterval: 30000
  });
};

// Time series analytics with real data
export const useTimeSeriesAnalytics = (
  metric: 'impressions' | 'clicks' | 'conversions' | 'revenue',
  interval: 'day' | 'week' | 'month',
  dateFilter: { startDate: string; endDate: string },
  entityId?: string,
  entityType?: 'brand' | 'retailer'
) => {
  return useQuery({
    queryKey: ['time-series', metric, interval, dateFilter, entityId, entityType],
    queryFn: async (): Promise<TimeSeriesData[]> => {
      // Get products for filtering if entity specified
      let productIds: string[] = [];
      
      if (entityId && entityType) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq(entityType === 'brand' ? 'brand_id' : 'retailer_id', entityId)
          .eq('status', 'active');
        
        productIds = products?.map(p => p.id) || [];
      }

      const eventType = metric === 'impressions' ? 'product_view' : 
                      metric === 'clicks' ? 'product_click' : 
                      metric === 'conversions' ? 'purchase' : 'product_view';

      // Get events data
      const eventsQuery = supabase
        .from('events')
        .select('created_at, event_type')
        .eq('event_type', eventType)
        .gte('created_at', dateFilter.startDate)
        .lte('created_at', dateFilter.endDate)
        .order('created_at');

      if (productIds.length > 0) {
        eventsQuery.in('product_id', productIds);
      }

      const { data: events } = await eventsQuery;

      // Group by date
      const dateGroups: Record<string, number> = {};
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      
      // Initialize all dates with 0
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dateGroups[dateKey] = 0;
      }

      // Count events by date
      events?.forEach(event => {
        const dateKey = new Date(event.created_at).toISOString().split('T')[0];
        if (dateGroups.hasOwnProperty(dateKey)) {
          dateGroups[dateKey]++;
        }
      });

      // Convert to array format
      return Object.entries(dateGroups).map(([date, value]) => ({
        date,
        value,
        revenue: metric === 'revenue' ? value * 45 : undefined,
        conversions: metric === 'conversions' ? value : undefined
      }));
    },
    refetchInterval: 30000
  });
};

// Product analytics hook for tracking user interactions
export const useProductAnalytics = () => {
  const trackProductView = async (productId: string, context: string) => {
    console.log('Tracking product view:', productId, context);
    
    try {
      // Get product to find brand_id and retailer_id
      const { data: product } = await supabase
        .from('products')
        .select('brand_id, retailer_id')
        .eq('id', productId)
        .single();

      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'product_view',
          product_id: productId,
          brand_id: product?.brand_id,
          retailer_id: product?.retailer_id,
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
      // Get product to find brand_id and retailer_id
      const { data: product } = await supabase
        .from('products')
        .select('brand_id, retailer_id')
        .eq('id', productId)
        .single();

      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'product_click',
          product_id: productId,
          brand_id: product?.brand_id,
          retailer_id: product?.retailer_id,
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
      // Get product to find brand_id and retailer_id
      const { data: product } = await supabase
        .from('products')
        .select('brand_id, retailer_id')
        .eq('id', productId)
        .single();

      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'wishlist_add',
          product_id: productId,
          brand_id: product?.brand_id,
          retailer_id: product?.retailer_id,
          event_data: {},
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
    console.log('Tracking add to cart:', productId, size, color);
    
    try {
      // Get product to find brand_id and retailer_id
      const { data: product } = await supabase
        .from('products')
        .select('brand_id, retailer_id')
        .eq('id', productId)
        .single();

      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'add_to_cart',
          product_id: productId,
          brand_id: product?.brand_id,
          retailer_id: product?.retailer_id,
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
