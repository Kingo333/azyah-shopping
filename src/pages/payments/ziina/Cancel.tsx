import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, CreditCard, ExternalLink, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SEOHead } from '@/components/SEOHead';

const PaymentCancel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const { createPaymentIntent, loading } = useSubscription();
  
  const paymentIntentId = searchParams.get('pi');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleRetryPayment = async () => {
    try {
      await createPaymentIntent(false);
    } catch (error) {
      console.error('Retry payment error:', error);
    }
  };

  return (
    <>
      <SEOHead 
        title="Payment Canceled - Azyah"
        description="Your payment was canceled. You can try again or return to your dashboard."
      />
      
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-2xl text-amber-600 dark:text-amber-400">
                Payment Canceled
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Your payment was not completed
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Payment Details */}
            {paymentIntentId && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">Premium Shopper</span>
                  
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">40 AED</span>
                  
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="font-mono text-xs break-all">{paymentIntentId}</span>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What happened?</h3>
              <p className="text-sm text-muted-foreground">
                Your payment was canceled and no charges were made to your account. 
                This can happen if you chose to go back during the payment process or 
                closed the payment window.
              </p>
            </div>

            {/* Premium Benefits Reminder */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Premium Benefits You're Missing
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• Unlimited AI Try-On sessions</li>
                <li>• Priority customer support</li>
                <li>• Advanced personalization features</li>
                <li>• Exclusive brand collaborations</li>
              </ul>
            </div>

            {/* Auto-redirect Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Redirecting to dashboard in {countdown} seconds...
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                Back to Dashboard
              </Button>
              <Button 
                onClick={handleRetryPayment}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Try Again
              </Button>
            </div>

            {/* Support Link */}
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => navigate('/support')}
                className="text-sm text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PaymentCancel;