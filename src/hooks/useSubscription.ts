
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PaymentRecord, CreatePaymentIntentRequest, CreatePaymentIntentResponse, PaymentStatusResponse } from '@/types/ziina';

interface UseSubscriptionReturn {
  payment: PaymentRecord | null;
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  createPaymentIntent: (test?: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has active premium payment
  const isPremium = (() => {
    if (!payment) return false;
    return payment.status === 'completed';
  })();

  const fetchPayment = async () => {
    if (!user) {
      setPayment(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('product', 'consumer_premium')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching payment:', error);
        setError(error.message);
      } else {
        setPayment(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching payment:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
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
      
      const requestBody: CreatePaymentIntentRequest = {
        product: 'consumer_premium',
        amountAed: 40,
        test
      };

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
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

      const response = data as CreatePaymentIntentResponse;
      if (response?.redirectUrl) {
        // Redirect to Ziina checkout
        window.location.href = response.redirectUrl;
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

  const refetch = fetchPayment;

  return {
    payment,
    isPremium,
    loading,
    error,
    createPaymentIntent,
    refetch
  };
}
