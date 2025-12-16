
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  last_payment_intent_id: string | null;
  last_payment_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  createPaymentIntent: (test?: boolean) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userPremiumStatus, setUserPremiumStatus] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has active premium subscription (from subscriptions table or users table)
  const isPremium = (() => {
    // First check users table premium status
    if (userPremiumStatus) return true;
    
    // Fallback to subscriptions table
    if (!subscription) return false;
    
    const now = new Date();
    return subscription.status === 'active' &&
           subscription.current_period_end &&
           new Date(subscription.current_period_end) >= now;
  })();

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setUserPremiumStatus(false);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch both subscription and user premium status in parallel
      const [subResult, userResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('users')
          .select('is_premium, premium_expires_at')
          .eq('id', user.id)
          .single()
      ]);

      if (subResult.error) {
        console.error('Error fetching subscription:', subResult.error);
        setError(subResult.error.message);
      } else {
        setSubscription(subResult.data);
      }

      // Check user premium status with expiry
      if (userResult.data) {
        const rawPremium = (userResult.data as any)?.is_premium ?? false;
        const expiresAt = (userResult.data as any)?.premium_expires_at;
        
        let isActive = rawPremium;
        if (expiresAt && new Date(expiresAt) < new Date()) {
          isActive = false;
        }
        setUserPremiumStatus(isActive);
      }
    } catch (err) {
      console.error('Unexpected error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const createPaymentIntent = async (test = false) => {
    toast({
      title: "Payment Integration Required",
      description: "Payment integration is being updated. Please check back soon.",
      variant: "default"
    });
  };

  const cancelSubscription = async () => {
    if (!user || !subscription) {
      toast({
        title: "Error",
        description: "No active subscription found",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Update both tables
      const [subResult, userResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id),
        supabase
          .from('users')
          .update({
            is_premium: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      ]);

      if (subResult.error) {
        console.error('Subscription cancellation error:', subResult.error);
        toast({
          title: "Cancellation Error",
          description: subResult.error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Subscription Canceled",
          description: "Your premium access will remain active until the current period ends.",
        });
        await fetchSubscription();
      }
    } catch (err) {
      console.error('Unexpected error canceling subscription:', err);
      toast({
        title: "Cancellation Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = fetchSubscription;

  return {
    subscription,
    isPremium,
    loading,
    error,
    createPaymentIntent,
    cancelSubscription,
    refetch
  };
}
