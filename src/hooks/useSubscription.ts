
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useZiinaPayments } from '@/hooks/useZiinaPayments';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentRecord {
  id: string;
  status: string;
  created_at: string;
  amount_fils: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const { createPaymentIntent: createZiinaPayment } = useZiinaPayments();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user has premium based on payment records
  const isPremium = payment?.status === 'completed';

  useEffect(() => {
    if (user) {
      loadPaymentData();
    }
  }, [user]);

  const loadPaymentData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading payment data:', error);
        return;
      }

      setPayment(data);
    } catch (error) {
      console.error('Error loading payment data:', error);
    }
  };

  const createPaymentIntent = async () => {
    setLoading(true);
    try {
      const result = await createZiinaPayment({
        amountAed: 40,
        message: 'Azyah Premium Subscription'
      });
      return result;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    // Placeholder for subscription cancellation logic
    console.log('Cancel subscription requested');
  };

  return {
    payment,
    isPremium,
    loading,
    createPaymentIntent,
    cancelSubscription
  };
}
