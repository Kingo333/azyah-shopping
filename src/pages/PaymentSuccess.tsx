import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SEOHead } from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatus {
  status: string;
  is_completed: boolean;
  is_active: boolean;
  amount?: number;
  currency?: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentIntentId = searchParams.get('payment_intent_id');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const { refetch } = useSubscription();

  const verifyPayment = async () => {
    if (!paymentIntentId) return;

    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { payment_intent_id: paymentIntentId }
      });

      if (!error && data) {
        setPaymentStatus(data);
        
        if (data.is_completed) {
          setLoading(false);
          refetch(); // Refresh subscription data
        }
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!paymentIntentId) {
      navigate('/');
      return;
    }

    verifyPayment();

    // Poll for payment completion (every 2s up to 30s for pending payments)
    const maxPolls = 15; // 30 seconds / 2 seconds
    const pollInterval = setInterval(() => {
      if (pollCount >= maxPolls || paymentStatus?.is_completed) {
        clearInterval(pollInterval);
        setLoading(false);
        return;
      }
      
      setPollCount(prev => prev + 1);
      verifyPayment();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [paymentIntentId, pollCount, paymentStatus?.is_completed]);

  const getStatusIcon = () => {
    if (loading || paymentStatus?.status === 'pending') {
      return <Clock className="w-12 h-12 text-yellow-500 animate-pulse" />;
    }
    if (paymentStatus?.is_completed) {
      return <CheckCircle className="w-12 h-12 text-green-500" />;
    }
    return <AlertCircle className="w-12 h-12 text-red-500" />;
  };

  const getStatusMessage = () => {
    if (loading) return 'Verifying your payment...';
    if (paymentStatus?.status === 'pending') return 'Payment is being processed...';
    if (paymentStatus?.is_completed) return 'Payment completed successfully!';
    if (paymentStatus?.status === 'failed') return 'Payment failed';
    return 'Payment status unknown';
  };

  return (
    <>
      <SEOHead 
        title="Payment Success - Azyah"
        description="Your payment has been processed successfully"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-2xl">
              {paymentStatus?.is_completed ? 'Welcome to Premium!' : getStatusMessage()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {paymentIntentId && (
              <p className="text-sm text-muted-foreground">
                Payment ID: {paymentIntentId}
              </p>
            )}
            
            {paymentStatus?.amount && paymentStatus?.currency && (
              <p className="text-lg font-semibold">
                {(paymentStatus.amount / 100).toFixed(2)} {paymentStatus.currency}
              </p>
            )}

            {loading && (
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your payment...
              </p>
            )}

            {paymentStatus?.is_completed && (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">
                  🎉 Your premium subscription is now active!
                </p>
                <p className="text-sm text-muted-foreground">
                  You now have access to all premium features including AI try-on, advanced filtering, and exclusive content.
                </p>
              </div>
            )}

            {paymentStatus?.status === 'pending' && pollCount >= 15 && (
              <div className="space-y-2">
                <p className="text-yellow-600">
                  Payment is still processing. This may take a few more minutes.
                </p>
                <Button 
                  variant="outline" 
                  onClick={verifyPayment}
                  className="w-full"
                >
                  Check Again
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
                variant={paymentStatus?.is_completed ? "default" : "outline"}
              >
                Continue Shopping
              </Button>
              
              {paymentStatus?.is_completed && (
                <Button 
                  onClick={() => navigate('/settings')} 
                  variant="outline"
                  className="w-full"
                >
                  Manage Subscription
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Having issues? <a href="/support" className="text-primary hover:underline">Contact Support</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}