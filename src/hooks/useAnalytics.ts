
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
}

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

export const useConversionFunnel = (entityId: string | undefined, entityType: 'brand' | 'retailer') => {
  return useQuery({
    queryKey: ['conversion-funnel', entityId, entityType],
    queryFn: async (): Promise<ConversionFunnelData[]> => {
      if (!entityId) throw new Error('Entity ID required');

      // Get products for this entity
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq(entityType === 'brand' ? 'brand_id' : 'retailer_id', entityId);

      const productIds = products?.map(p => p.id) || [];

      // Get funnel data
      const { data: views } = await supabase
        .from('events')
        .select('session_id')
        .eq('event_type', 'product_view')
        .in('product_id', productIds);

      const { data: likes } = await supabase
        .from('likes')
        .select('*')
        .in('product_id', productIds);

      const { data: wishlistAdds } = await supabase
        .from('wishlist_items')
        .select('*')
        .in('product_id', productIds);

      const totalViews = views?.length || 0;
      const totalLikes = likes?.length || 0;
      const totalWishlistAdds = wishlistAdds?.length || 0;

      return [
        {
          stage: 'Views',
          count: totalViews,
          percentage: 100
        },
        {
          stage: 'Likes',
          count: totalLikes,
          percentage: totalViews > 0 ? (totalLikes / totalViews) * 100 : 0
        },
        {
          stage: 'Wishlist Adds',
          count: totalWishlistAdds,
          percentage: totalLikes > 0 ? (totalWishlistAdds / totalLikes) * 100 : 0
        }
      ];
    },
    enabled: !!entityId
  });
};
