import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const { createPaymentIntent } = useSubscription();
  const [searchParams] = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent_id');
  const [countdown, setCountdown] = useState(10);

  // Auto-redirect to dashboard after 10 seconds
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-orange-900 dark:text-orange-100">
                Payment Canceled
              </CardTitle>
              <p className="text-orange-700 dark:text-orange-300 mt-2">
                Your payment was not completed
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Info */}
            <div className="bg-white dark:bg-gray-900/30 rounded-lg p-4 border">
              <h3 className="font-semibold text-foreground mb-3">Payment Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">Premium Shopper</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">40 AED / month</span>
                </div>
                {paymentIntentId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID:</span>
                    <span className="font-mono text-xs">{paymentIntentId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* What Happened */}
            <div className="bg-white dark:bg-gray-900/30 rounded-lg p-4 border">
              <h3 className="font-semibold text-foreground mb-3">What happened?</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Your payment was canceled before completion. This could be because:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>You chose to go back or cancel during the payment process</li>
                  <li>The payment session expired</li>
                  <li>There was a technical issue with the payment</li>
                </ul>
                <p className="mt-2">
                  Don't worry - no charges have been made to your account.
                </p>
              </div>
            </div>

            {/* Premium Benefits Reminder */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-foreground mb-3">What you're missing:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Unlimited Toy Replica generations</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Full access to all premium features</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Priority customer support</span>
                </li>
              </ul>
            </div>

            {/* Auto-redirect notice */}
            <div className="text-center text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border">
              <p>Redirecting to dashboard in {countdown} seconds...</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={handleRetryPayment}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>

            {/* Support Info */}
            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              <p>
                Having trouble with payment? Visit our 
                <Button variant="link" className="px-1 h-auto text-sm" onClick={() => navigate('/settings')}>
                  support page
                </Button>
                or try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCancel;