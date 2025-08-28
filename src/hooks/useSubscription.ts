
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { storePaymentSessionBackup } from '@/utils/paymentSessionManager';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has active premium subscription
  const isPremium = (() => {
    if (!subscription) return false;
    
    const now = new Date();
    return (subscription.status === 'active' || subscription.status === 'canceled') &&
           subscription.current_period_end &&
           new Date(subscription.current_period_end) >= now;
  })();

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setError(error.message);
      } else {
        setSubscription(data);
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
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade to premium",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Refresh session before payment to ensure it's valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session validation failed:', sessionError);
        toast({
          title: "Authentication Error",
          description: "Please refresh the page and try again",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amountAed: 30, test, message: "Azyah Premium" },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Payment intent creation error:', error);
        toast({
          title: "Payment Error",
          description: error.message || 'Failed to create payment',
          variant: "destructive"
        });
        return;
      }

      // Handle new response format: { redirectUrl, pi }
      if (data?.redirectUrl) {
        // Store session backup before redirect
        storePaymentSessionBackup(session, user, data.pi);
        
        // Redirect to Ziina checkout
        window.location.href = data.redirectUrl;
      } else {
        toast({
          title: "Payment Error", 
          description: "No payment URL received",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Unexpected error creating payment intent:', err);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Subscription cancellation error:', error);
        toast({
          title: "Cancellation Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Subscription Canceled",
          description: "Your premium access will remain active until the current period ends.",
        });
        await fetchSubscription(); // Refresh subscription data
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
