
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string;
  created_at: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check for completed payments as a proxy for subscription status
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);

        if (payments && payments.length > 0) {
          const payment = payments[0];
          // Create a mock subscription based on successful payment
          const mockSubscription: Subscription = {
            id: payment.id,
            user_id: user.id,
            plan: 'premium',
            status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: payment.created_at
          };
          setSubscription(mockSubscription);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const isPremium = subscription?.status === 'active';

  return {
    subscription,
    loading,
    isPremium
  };
}
