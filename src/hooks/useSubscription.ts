import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Safe subscription data - excludes sensitive payment provider IDs
interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
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
  const [profilePremiumStatus, setProfilePremiumStatus] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has active premium subscription (from subscriptions table or profiles table)
  const isPremium = (() => {
    // First check profiles table premium status
    if (profilePremiumStatus) return true;
    
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
      setProfilePremiumStatus(false);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch both subscription and profile premium status in parallel
      const [subResult, profileResult] = await Promise.all([
        // Select only non-sensitive columns - excludes payment provider IDs
        supabase
          .from('subscriptions')
          .select('id, user_id, plan, status, current_period_start, current_period_end, created_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('is_premium, premium_expires_at')
          .eq('id', user.id)
          .maybeSingle()
      ]);

      if (subResult.error) {
        console.error('Error fetching subscription:', subResult.error);
        setError(subResult.error.message);
      } else {
        setSubscription(subResult.data);
      }

      // Check profile premium status with expiry
      if (profileResult.data) {
        const rawPremium = profileResult.data.is_premium ?? false;
        const expiresAt = profileResult.data.premium_expires_at;
        
        let isActive = rawPremium;
        if (expiresAt && new Date(expiresAt) < new Date()) {
          isActive = false;
        }
        setProfilePremiumStatus(isActive);
      } else {
        // No profile found - treat as non-premium
        setProfilePremiumStatus(false);
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
      title: "iOS Only",
      description: "Subscriptions are available on iOS. Download the app to subscribe!",
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
      
      // Update both tables - subscriptions and profiles
      const [subResult, profileResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .update({
            is_premium: false,
            plan_type: null,
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
