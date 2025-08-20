import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

  const trackSwipe = useMutation({
    mutationFn: async ({ productId, action, product, viewDuration, confidence = 1.0 }: SwipeTrackingData) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Create metadata object with product context
      const metadata = {
        category: product?.category_slug,
        subcategory: product?.subcategory_slug,
        brand: product?.brands?.name,
        price_cents: product?.price_cents,
        currency: product?.currency,
        tags: product?.tags || [],
        attributes: product?.attributes || {},
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

      // Insert enhanced swipe record
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
    },
    onSuccess: (data) => {
      // Debounced invalidation to prevent excessive re-fetching
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['enhanced-swipe-products'] });
        queryClient.invalidateQueries({ queryKey: ['user-taste-profile'] });
      }, 1000); // Batch invalidations
      
      console.log('Enhanced swipe tracked:', data);
    },
    onError: (error) => {
      console.error('Failed to track swipe:', error);
      toast.error('Failed to track preference');
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