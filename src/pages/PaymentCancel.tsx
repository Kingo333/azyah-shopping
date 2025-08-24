import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SEOHead } from '@/components/SEOHead';
import { clearPaymentSessionBackup } from '@/utils/paymentSessionManager';

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentIntentId = searchParams.get('payment_intent_id');
  const [countdown, setCountdown] = useState(10);
  const { createPaymentIntent, loading } = useSubscription();

  useEffect(() => {
    // Delay clearing payment session backup to allow auth recovery
    const clearTimer = setTimeout(() => {
      clearPaymentSessionBackup();
    }, 2000);
    
    const redirectTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(clearTimer);
      clearInterval(redirectTimer);
    };
  }, [navigate]);

  const handleRetryPayment = async () => {
    await createPaymentIntent(false);
  };

  return (
    <>
      <SEOHead 
        title="Payment Canceled - Azyah"
        description="Your payment was canceled"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Payment Canceled</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {paymentIntentId && (
              <p className="text-sm text-muted-foreground">
                Payment ID: {paymentIntentId}
              </p>
            )}
            
            <p className="text-muted-foreground">
              Your payment was canceled and no charges have been made.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Why upgrade to Premium?</h3>
              <ul className="text-sm text-left space-y-1">
                <li>• AI virtual try-on technology</li>
                <li>• Advanced product filtering</li>
                <li>• Exclusive designer collections</li>
                <li>• Priority customer support</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in {countdown} seconds...
            </p>

            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/dashboard')} 
                variant="outline"
                className="w-full"
              >
                Back to Dashboard
              </Button>
              
              <Button 
                onClick={handleRetryPayment}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Try Again'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Need help? <a href="/support" className="text-primary hover:underline">Contact Support</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}