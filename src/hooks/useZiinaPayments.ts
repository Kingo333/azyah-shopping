
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse, VerifyPaymentRequest, PaymentStatusResponse } from '@/types/ziina';

export function useZiinaPayments() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

      return data as PaymentStatusResponse;
    } catch (err) {
      console.error('Unexpected verification error:', err);
      return null;
    }
  };

  return {
    createPaymentIntent,
    verifyPayment,
    loading
  };
}
