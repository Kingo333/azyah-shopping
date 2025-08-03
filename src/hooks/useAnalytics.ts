import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface AnalyticsEvent {
  id?: number;
  user_id?: string;
  session_id?: string;
  event_type: string;
  event_data?: Record<string, any>;
  product_id?: string;
  brand_id?: string;
  retailer_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  created_at?: string;
}

export interface AnalyticsMetrics {
  impressions: number;
  clicks: number;
  wishlist_adds: number;
  ar_views: number;
  conversions: number;
  revenue_cents: number;
  ctr: number;
  conversion_rate: number;
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  conversion_rate: number;
}

// Track analytics events
export const useTrackEvent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<AnalyticsEvent, 'id' | 'created_at'>) => {
      const sessionId = sessionStorage.getItem('analytics_session') || crypto.randomUUID();
      sessionStorage.setItem('analytics_session', sessionId);

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...event,
          user_id: user?.id,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          ip_address: null // Will be populated by backend if needed
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate analytics queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });
};

// Get analytics overview
export const useAnalyticsOverview = (
  filters?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
    brandId?: string;
    retailerId?: string;
  }
) => {
  return useQuery({
    queryKey: ['analytics', 'overview', filters],
    queryFn: async (): Promise<AnalyticsMetrics> => {
      let query = supabase
        .from('events')
        .select('event_type, event_data, product_id, created_at');

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.brandId) {
        query = query.eq('brand_id', filters.brandId);
      }
      if (filters?.retailerId) {
        query = query.eq('retailer_id', filters.retailerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate metrics from raw events
      const impressions = data.filter(e => e.event_type === 'product_view').length;
      const clicks = data.filter(e => e.event_type === 'product_click').length;
      const wishlist_adds = data.filter(e => e.event_type === 'wishlist_add').length;
      const ar_views = data.filter(e => e.event_type === 'ar_view').length;
      const conversions = data.filter(e => e.event_type === 'purchase').length;
      
      const revenue_cents = data
        .filter(e => e.event_type === 'purchase')
        .reduce((sum, e) => {
          const eventData = e.event_data as any;
          return sum + (eventData?.amount_cents || 0);
        }, 0);

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const conversion_rate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      return {
        impressions,
        clicks,
        wishlist_adds,
        ar_views,
        conversions,
        revenue_cents,
        ctr: Math.round(ctr * 100) / 100,
        conversion_rate: Math.round(conversion_rate * 100) / 100
      };
    }
  });
};

// Get conversion funnel data
export const useConversionFunnel = (
  filters?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
  }
) => {
  return useQuery({
    queryKey: ['analytics', 'funnel', filters],
    queryFn: async (): Promise<ConversionFunnelData[]> => {
      let query = supabase
        .from('events')
        .select('event_type, session_id')
        .in('event_type', ['product_view', 'product_click', 'wishlist_add', 'ar_view', 'add_to_cart', 'purchase']);

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by session and calculate funnel progression
      const sessionData = data.reduce((acc, event) => {
        if (!acc[event.session_id]) {
          acc[event.session_id] = new Set();
        }
        acc[event.session_id].add(event.event_type);
        return acc;
      }, {} as Record<string, Set<string>>);

      const totalSessions = Object.keys(sessionData).length;
      const stages = [
        { stage: 'Product View', event: 'product_view' },
        { stage: 'Product Click', event: 'product_click' },
        { stage: 'AR Try-On', event: 'ar_view' },
        { stage: 'Add to Cart', event: 'add_to_cart' },
        { stage: 'Purchase', event: 'purchase' }
      ];

      return stages.map((stage, index) => {
        const count = Object.values(sessionData).filter(events => 
          events.has(stage.event)
        ).length;
        
        const previousCount = index === 0 ? totalSessions : 
          Object.values(sessionData).filter(events => 
            events.has(stages[index - 1].event)
          ).length;
        
        const conversion_rate = previousCount > 0 ? (count / previousCount) * 100 : 0;

        return {
          stage: stage.stage,
          count,
          conversion_rate: Math.round(conversion_rate * 100) / 100
        };
      });
    }
  });
};

// Get time-based analytics
export const useTimeSeriesAnalytics = (
  metric: 'impressions' | 'clicks' | 'conversions' | 'revenue',
  period: 'hour' | 'day' | 'week' = 'day',
  filters?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
  }
) => {
  return useQuery({
    queryKey: ['analytics', 'timeseries', metric, period, filters],
    queryFn: async () => {
      const eventTypes = {
        impressions: 'product_view',
        clicks: 'product_click',
        conversions: 'purchase',
        revenue: 'purchase'
      };

      let query = supabase
        .from('events')
        .select('created_at, event_data')
        .eq('event_type', eventTypes[metric]);

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group data by time period
      const groupedData = data.reduce((acc, event) => {
        const date = new Date(event.created_at);
        let key: string;

        switch (period) {
          case 'hour':
            key = date.toISOString().slice(0, 13) + ':00:00.000Z';
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().slice(0, 10);
            break;
          default: // day
            key = date.toISOString().slice(0, 10);
        }

        if (!acc[key]) {
          acc[key] = { count: 0, value: 0 };
        }
        
        acc[key].count += 1;
        if (metric === 'revenue') {
          const eventData = event.event_data as any;
          acc[key].value += eventData?.amount_cents || 0;
        } else {
          acc[key].value += 1;
        }

        return acc;
      }, {} as Record<string, { count: number; value: number }>);

      // Convert to array and sort by date
      return Object.entries(groupedData)
        .map(([date, data]) => ({
          date,
          count: data.count,
          value: data.value
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  });
};

// Track specific product interactions
export const useProductAnalytics = () => {
  const trackEvent = useTrackEvent();

  const trackProductView = (productId: string, source?: string) => {
    trackEvent.mutate({
      event_type: 'product_view',
      product_id: productId,
      event_data: { source }
    });
  };

  const trackProductClick = (productId: string, source?: string) => {
    trackEvent.mutate({
      event_type: 'product_click',
      product_id: productId,
      event_data: { source }
    });
  };

  const trackWishlistAdd = (productId: string) => {
    trackEvent.mutate({
      event_type: 'wishlist_add',
      product_id: productId
    });
  };

  const trackARView = (productId: string, duration?: number) => {
    trackEvent.mutate({
      event_type: 'ar_view',
      product_id: productId,
      event_data: { duration_seconds: duration }
    });
  };

  const trackAddToCart = (productId: string, size?: string, color?: string) => {
    trackEvent.mutate({
      event_type: 'add_to_cart',
      product_id: productId,
      event_data: { size, color }
    });
  };

  return {
    trackProductView,
    trackProductClick,
    trackWishlistAdd,
    trackARView,
    trackAddToCart,
    isTracking: trackEvent.isPending
  };
};