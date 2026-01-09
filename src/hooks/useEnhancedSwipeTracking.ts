import { useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

const MAX_QUEUE_SIZE = 50;

interface SwipeTrackingData {
  productId: string;
  action: 'right' | 'left' | 'up';
  product?: any;
  viewDuration?: number;
  confidence?: number;
}

export const useEnhancedSwipeTracking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Request queue to batch operations and prevent overwhelming
  const requestQueue = useRef<Array<() => Promise<any>>>([]);
  const isProcessingQueue = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) return;
    
    isProcessingQueue.current = true;
    const batchSize = 3; // Process max 3 requests at once
    
    while (requestQueue.current.length > 0) {
      const batch = requestQueue.current.splice(0, batchSize);
      await Promise.allSettled(batch.map(request => request()));
      
      // Small delay between batches to prevent overwhelming
      if (requestQueue.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    isProcessingQueue.current = false;
  }, []);

  // Debounced invalidation manager
  const invalidationTimeout = useRef<NodeJS.Timeout>();
  const debouncedInvalidate = useCallback(() => {
    clearTimeout(invalidationTimeout.current);
    invalidationTimeout.current = setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['enhanced-swipe-products'], 
        exact: false,
        refetchType: 'none' // Don't refetch immediately
      });
      queryClient.invalidateQueries({ 
        queryKey: ['user-taste-profile'],
        exact: false,
        refetchType: 'none'
      });
    }, 2000); // Increased debounce time
  }, [queryClient]);

  const trackSwipe = useMutation({
    mutationFn: async ({ productId, action, product, viewDuration, confidence = 1.0 }: SwipeTrackingData) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Lightweight metadata - only essential info
      const metadata = {
        category: product?.category_slug,
        brand: product?.brands?.name,
        price_cents: product?.price_cents,
        timestamp: Date.now()
      };

      // Calculate learning weight based on action and context
      const learning_weight = (() => {
        switch (action) {
          case 'up': return 3.0; // Wishlist - strongest signal
          case 'right': return 2.0; // Like - strong positive signal
          case 'left': return 1.0; // Pass - important negative signal
          default: return 1.0;
        }
      })();

      // Add to queue instead of immediate execution
      const swipeRequest = async () => {
        try {
          const { data, error } = await supabase
            .from('swipes')
            .insert({
              user_id: user.id,
              product_id: productId,
              action,
              metadata,
              confidence_score: confidence,
              learning_weight,
              view_duration_ms: viewDuration,
              session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            })
            .select()
            .single();

          if (error) throw error;
          return data;
        } catch (error) {
          logger.error('Queued swipe tracking failed:', error);
          throw error;
        }
      };

      // Cap queue size to prevent unbounded growth
      if (requestQueue.current.length >= MAX_QUEUE_SIZE) {
        // Drop oldest half of requests
        requestQueue.current = requestQueue.current.slice(-MAX_QUEUE_SIZE / 2);
      }
      
      requestQueue.current.push(swipeRequest);
      processQueue(); // Process queue asynchronously
      
      // Return immediately for UI responsiveness
      return Promise.resolve({ queued: true });
    },
    onSuccess: () => {
      debouncedInvalidate();
    },
    onError: (error) => {
      logger.error('Failed to track swipe:', error);
      // Don't show toast for every error to avoid spam
    }
  });

  // Track viewing time for implicit feedback
  const trackViewDuration = (productId: string, startTime: number) => {
    const duration = Date.now() - startTime;
    
    // Only track meaningful view durations (1-30 seconds)
    if (duration >= 1000 && duration <= 30000) {
      return duration;
    }
    return undefined;
  };

  return {
    trackSwipe: trackSwipe.mutateAsync,
    trackViewDuration,
    isTracking: trackSwipe.isPending
  };
};