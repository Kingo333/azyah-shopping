
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createPaymentIntent } = useSubscription();
  const [countdown, setCountdown] = useState(15);

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
        title="Payment Failed"
        description="Your payment failed to process"
      />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Payment Failed</CardTitle>
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

            {/* Failure Reasons */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-red-800 dark:text-red-200">
                Common reasons for payment failure
              </h3>
              <ul className="text-sm space-y-1 text-red-700 dark:text-red-300">
                <li>• Insufficient funds in your account</li>
                <li>• Incorrect card details (number, expiry, CVV)</li>
                <li>• Card declined by your bank</li>
                <li>• Network or connectivity issues</li>
                <li>• Card not enabled for online transactions</li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">
                What to try next
              </h3>
              <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Check your card details and try again</li>
                <li>• Contact your bank to enable online payments</li>
                <li>• Try a different payment method</li>
                <li>• Ensure you have sufficient funds</li>
                <li>• Wait a few minutes and retry the payment</li>
              </ul>
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
                Still having issues?{' '}
                <a href="/support" className="text-primary hover:underline">
                  Contact Support
                </a>{' '}
                or{' '}
                <a href="/profile-settings" className="text-primary hover:underline">
                  Payment Settings
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
