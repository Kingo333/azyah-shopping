
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createPaymentIntent } = useSubscription();
  const [countdown, setCountdown] = useState(10);

  const paymentIntentId = searchParams.get('pi');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleRetryPayment = async () => {
    await createPaymentIntent();
  };

  return (
    <>
      <SEOHead 
        title="Payment Canceled"
        description="Your payment was canceled"
      />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-orange-600">Payment Canceled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Details */}
            {paymentIntentId && (
              <div className="bg-secondary rounded-lg p-4">
                <h3 className="font-semibold mb-3">Payment Details</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="ml-2 font-medium">Premium Subscription</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="ml-2 font-medium">40 AED</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment ID:</span>
                    <span className="ml-2 font-mono text-xs">{paymentIntentId}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Info */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-orange-800 dark:text-orange-200">
                Why was my payment canceled?
              </h3>
              <ul className="text-sm space-y-1 text-orange-700 dark:text-orange-300">
                <li>• You clicked the "Cancel" button during payment</li>
                <li>• You closed the payment window before completing</li>
                <li>• You navigated away from the payment page</li>
                <li>• The payment session expired</li>
              </ul>
            </div>

            {/* Premium Benefits */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">
                Premium Benefits You're Missing
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Unlock Premium Access — 40 AED/month • 20 AI Try-ons daily • Unlimited replica • UGC collabs</strong>
              </div>
            </div>

            {/* Auto-redirect notice */}
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                You'll be automatically redirected to the dashboard in{' '}
                <span className="font-medium">{countdown}</span> seconds.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                Back to Dashboard
              </Button>
              <Button 
                onClick={handleRetryPayment}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Need help?{' '}
                <a href="/support" className="text-primary hover:underline">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
