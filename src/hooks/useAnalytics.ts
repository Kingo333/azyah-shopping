
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
  conversion_rate: number; // Added missing property
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
}

// Main analytics hook for brand/retailer specific metrics
export const useAnalytics = (entityId: string | undefined, entityType: 'brand' | 'retailer') => {
  return useQuery({
    queryKey: ['analytics', entityId, entityType],
    queryFn: async (): Promise<AnalyticsMetrics> => {
      if (!entityId) throw new Error('Entity ID required');

      // Get views based on entity type
      const viewsQuery = entityType === 'brand' 
        ? supabase.from('events').select('*').eq('brand_id', entityId).eq('event_type', 'product_view')
        : supabase.from('events').select('*').eq('retailer_id', entityId).eq('event_type', 'product_view');

      const { data: views } = await viewsQuery;
      
      // Get likes
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq(entityType === 'brand' ? 'brand_id' : 'retailer_id', entityId);

      const productIds = products?.map(p => p.id) || [];
      
      const { data: likes } = await supabase
        .from('likes')
        .select('*')
        .in('product_id', productIds);

      // Get wishlist adds
      const { data: wishlistAdds } = await supabase
        .from('wishlist_items')
        .select('*')
        .in('product_id', productIds);

      // Calculate metrics
      const totalViews = views?.length || 0;
      const totalLikes = likes?.length || 0;
      const totalWishlistAdds = wishlistAdds?.length || 0;
      const conversionRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

      return {
        totalViews,
        totalLikes,
        totalWishlistAdds,
        conversionRate: Math.round(conversionRate * 100) / 100,
        topReferrers: [], // Will implement with affiliate_clicks table
        repeatShopperRate: 0, // Will implement with order analysis
        avgSwipeSentiment: 0 // Will implement with swipe_actions analysis
      };
    },
    enabled: !!entityId
  });
};

// Analytics overview hook
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
      
      // Mock data for now - replace with real queries
      return {
        impressions: Math.floor(Math.random() * 10000) + 1000,
        clicks: Math.floor(Math.random() * 1000) + 100,
        ctr: Math.random() * 10 + 1,
        wishlist_adds: Math.floor(Math.random() * 500) + 50,
        conversions: Math.floor(Math.random() * 100) + 10,
        revenue_cents: Math.floor(Math.random() * 100000) + 10000,
        ar_views: Math.floor(Math.random() * 200) + 20
      };
    }
  });
};

// Conversion funnel hook
export const useConversionFunnel = (params: {
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: ['conversion-funnel', params],
    queryFn: async (): Promise<ConversionFunnelData[]> => {
      // Mock data for now - replace with real queries
      const stages = [
        { stage: 'Impressions', count: 10000, percentage: 100, conversion_rate: 100 },
        { stage: 'Clicks', count: 1500, percentage: 15, conversion_rate: 15 },
        { stage: 'Wishlist', count: 300, percentage: 3, conversion_rate: 20 },
        { stage: 'Purchases', count: 75, percentage: 0.75, conversion_rate: 25 }
      ];
      
      return stages;
    }
  });
};

// Time series analytics hook
export const useTimeSeriesAnalytics = (
  metric: 'impressions' | 'clicks' | 'conversions' | 'revenue',
  interval: 'day' | 'week' | 'month',
  dateFilter: { startDate: string; endDate: string }
) => {
  return useQuery({
    queryKey: ['time-series', metric, interval, dateFilter],
    queryFn: async (): Promise<TimeSeriesData[]> => {
      // Generate mock time series data
      const days = Math.ceil((new Date(dateFilter.endDate).getTime() - new Date(dateFilter.startDate).getTime()) / (1000 * 60 * 60 * 24));
      const data: TimeSeriesData[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(dateFilter.startDate);
        date.setDate(date.getDate() + i);
        
        data.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 1000) + 100
        });
      }
      
      return data;
    }
  });
};

// Product analytics hook for tracking user interactions
export const useProductAnalytics = () => {
  const trackProductView = async (productId: string, context: string) => {
    console.log('Tracking product view:', productId, context);
    // Implementation would go here
  };

  const trackProductClick = async (productId: string, context: string) => {
    console.log('Tracking product click:', productId, context);
    // Implementation would go here
  };

  const trackWishlistAdd = async (productId: string) => {
    console.log('Tracking wishlist add:', productId);
    // Implementation would go here
  };

  const trackAddToCart = async (productId: string, size?: string, color?: string) => {
    console.log('Tracking add to cart:', productId, size, color);
    // Implementation would go here
  };

  return {
    trackProductView,
    trackProductClick,
    trackWishlistAdd,
    trackAddToCart
  };
};
