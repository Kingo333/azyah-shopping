import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsSummary {
  total_swipes: number;
  positive_swipes: number;
  negative_swipes: number;
  wishlist_actions: number;
  top_categories: Record<string, number>;
  top_brands: Record<string, number>;
  recent_activity: Array<{
    product_id: string;
    action: string;
    created_at: string;
    product_title: string;
    category: string;
  }>;
  preference_confidence: number;
}

interface UserPreferences {
  category_preferences: Record<string, number>;
  brand_preferences: Record<string, number>;
  price_preferences: Record<string, number>;
  total_swipes: number;
  positive_swipes: number;
  negative_swipes: number;
  preference_confidence: number;
}

interface AnalyticsEvent {
  event_type: string;
  product_id?: string;
  event_data: Record<string, any>;
  created_at?: string;
}

// Batch queue for analytics events
let eventQueue: AnalyticsEvent[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

export const useServerSideAnalytics = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get analytics summary (cached for 5 minutes)
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError
  } = useQuery({
    queryKey: ['analytics-summary', user?.id],
    queryFn: async (): Promise<AnalyticsSummary> => {
      const url = new URL(`https://klwolsopucgswhtdlsps.supabase.co/functions/v1/analytics-api`);
      url.searchParams.set('user_id', user!.id);
      url.searchParams.set('type', 'summary');
      
      const session = await supabase.auth.getSession();
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsd29sc29wdWNnc3dodGRsc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTQ4NTIsImV4cCI6MjA2OTgzMDg1Mn0.t1GFgR9xiIh7PBmoYs_xKLi1fF1iLTF6pqMlLMHowHQ',
        },
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Batch analytics tracking mutation
  const batchTrackMutation = useMutation({
    mutationFn: async (events: AnalyticsEvent[]) => {
      const { data: batchData, error: batchError } = await supabase.functions.invoke('analytics-api/batch-track', {
        body: { events },
        method: 'POST',
      });

      if (batchError) throw batchError;
      return batchData;
    },
    onSuccess: () => {
      // Invalidate analytics caches after successful batch
      queryClient.invalidateQueries({ 
        queryKey: ['analytics-summary', user?.id],
        refetchType: 'none' 
      });
    },
  });

  // Queue an analytics event
  const trackEvent = (event: AnalyticsEvent) => {
    if (!user?.id) return;

    // Add to queue
    eventQueue.push({
      ...event,
      created_at: event.created_at || new Date().toISOString(),
    });

    // Limit queue size to prevent memory issues
    if (eventQueue.length > 50) {
      eventQueue = eventQueue.slice(-30); // Keep only last 30 events
    }

    // Process batch after 30 seconds or when queue reaches 10 events
    if (eventQueue.length >= 10) {
      processBatch();
    } else {
      if (batchTimeout) clearTimeout(batchTimeout);
      batchTimeout = setTimeout(processBatch, 30000);
    }
  };

  // Process batch queue
  const processBatch = async () => {
    if (eventQueue.length === 0) return;
    
    const eventsToProcess = [...eventQueue];
    eventQueue = []; // Clear queue immediately
    
    try {
      await batchTrackMutation.mutateAsync(eventsToProcess);
    } catch (error) {
      console.error('Failed to process analytics batch:', error);
    }
  };

  return {
    summary,
    isLoading: summaryLoading,
    error: summaryError,
    trackEvent,
    isBatchProcessing: batchTrackMutation.isPending,
  };
};