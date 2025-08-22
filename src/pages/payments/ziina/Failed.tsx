import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, CreditCard, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SEOHead } from '@/components/SEOHead';

const PaymentFailed: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(15);
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
        title="Payment Failed - Azyah"
        description="Your payment could not be processed. Please try again or contact support."
      />
      
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-2xl text-red-600 dark:text-red-400">
                Payment Failed
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                We couldn't process your payment
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

            {/* Common Reasons */}
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
                Common Reasons for Payment Failure
              </h3>
              <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                <li>• Insufficient funds in your account</li>
                <li>• Incorrect card details entered</li>
                <li>• Card expired or blocked</li>
                <li>• Network or connection issues</li>
                <li>• Card issuer declined the transaction</li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What can you do?</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. <strong>Check your card details</strong> and try again</p>
                <p>2. <strong>Try a different payment method</strong> if available</p>
                <p>3. <strong>Contact your bank</strong> to ensure the transaction isn't blocked</p>
                <p>4. <strong>Contact our support team</strong> if the issue persists</p>
              </div>
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
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Try Again
              </Button>
            </div>

            {/* Support Links */}
            <div className="flex justify-center gap-4">
              <Button 
                variant="link" 
                onClick={() => navigate('/support')}
                className="text-sm text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Contact Support
              </Button>
              <Button 
                variant="link" 
                onClick={() => navigate('/profile-settings')}
                className="text-sm text-muted-foreground"
              >
                Payment Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PaymentFailed;