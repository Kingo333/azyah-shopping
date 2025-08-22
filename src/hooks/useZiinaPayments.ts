
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse, VerifyPaymentRequest, PaymentStatusResponse } from '@/types/ziina';

interface PaymentRecord {
  id: string;
  provider: string;
  payment_intent_id: string;
  user_id: string;
  product: string;
  amount_fils: number;
  currency: string;
  status: string;
  redirect_url?: string;
  success_url?: string;
  cancel_url?: string;
  fee_amount_fils?: number;
  tip_amount_fils: number;
  latest_error_message?: string;
  latest_error_code?: string;
  created_at: string;
  updated_at: string;
}

export function useZiinaPayments() {
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check for existing payment/premium status
  useEffect(() => {
    if (user) {
      checkPremiumStatus();
    }
  }, [user]);

  const checkPremiumStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking premium status:', error);
        return;
      }

      if (data && data.length > 0) {
        setPayment(data[0]);
        setIsPremium(true);
      }
    } catch (err) {
      console.error('Unexpected error checking premium status:', err);
    }
  };

  const createPaymentIntent = async (request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse | null> => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to make a payment",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: request,
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
        return null;
      }

      return data as CreatePaymentIntentResponse;
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (request: VerifyPaymentRequest): Promise<PaymentStatusResponse | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Payment verification error:', error);
        return null;
      }

      // Refresh premium status after verification
      if (data && data.status === 'completed') {
        await checkPremiumStatus();
      }

      return data as PaymentStatusResponse;
    } catch (err) {
      console.error('Unexpected verification error:', err);
      return null;
    }
  };

  const createPayment = async (amountAed: number, test: boolean = false, message: string = 'Premium subscription') => {
    const result = await createPaymentIntent({
      amountAed,
      test,
      message
    });

    if (result?.redirectUrl) {
      window.location.href = result.redirectUrl;
    }
  };

  return {
    createPaymentIntent,
    verifyPayment,
    createPayment,
    payment,
    isPremium,
    loading
  };
}
