import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SEOHead } from '@/components/SEOHead';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentIntentId = searchParams.get('payment_intent_id');
  const [countdown, setCountdown] = useState(10);
  const { createPaymentIntent, loading } = useSubscription();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleRetryPayment = async () => {
    await createPaymentIntent(false);
  };

  return (
    <>
      <SEOHead 
        title="Payment Failed - Azyah"
        description="Your payment failed to process"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Payment Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {paymentIntentId && (
              <p className="text-sm text-muted-foreground">
                Payment ID: {paymentIntentId}
              </p>
            )}
            
            <p className="text-muted-foreground">
              We couldn't process your payment. Please try again or use a different payment method.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Common reasons for payment failure:</h3>
              <ul className="text-sm text-left space-y-1">
                <li>• Insufficient funds</li>
                <li>• Incorrect card details</li>
                <li>• Card expired or blocked</li>
                <li>• Bank security restrictions</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Troubleshooting steps:</h3>
              <ul className="text-sm text-left space-y-1">
                <li>• Check your card details</li>
                <li>• Ensure sufficient balance</li>
                <li>• Try a different card</li>
                <li>• Contact your bank if needed</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Redirecting to home in {countdown} seconds...
            </p>

            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/')} 
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

            <div className="flex justify-center space-x-4 text-xs">
              <a href="/support" className="text-primary hover:underline">Contact Support</a>
              <a href="/settings" className="text-primary hover:underline">Payment Settings</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}