
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useZiinaPayments } from '@/hooks/useZiinaPayments';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, Loader2 } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import type { PaymentStatusResponse } from '@/types/ziina';
import { convertFilsToAed } from '@/utils/ziina';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyPayment } = useZiinaPayments();
  const { toast } = useToast();
  
  const [verification, setVerification] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentIntentId = searchParams.get('pi');

  useEffect(() => {
    if (paymentIntentId) {
      verifyPaymentStatus();
    } else {
      setError('Missing payment information');
      setLoading(false);
    }
  }, [paymentIntentId]);

  const verifyPaymentStatus = async () => {
    if (!paymentIntentId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await verifyPayment({ pi: paymentIntentId });
      
      if (!result) {
        setError('Failed to verify payment');
        return;
      }

      setVerification(result);
      
      if (result.is_completed) {
        toast({
          title: "Payment Successful!",
          description: "Your premium subscription is now active.",
        });
      } else if (result.status === 'pending') {
        startPolling();
      } else {
        toast({
          title: "Payment Incomplete",
          description: `Payment status: ${result.status}`,
          variant: "destructive"
        });
      }

    } catch (err) {
      console.error('Verification error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (!paymentIntentId) return;
    
    setPolling(true);
    let pollCount = 0;
    const maxPolls = 15; // 30 seconds (2s interval)
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      const result = await verifyPayment({ pi: paymentIntentId });
      if (result) {
        setVerification(result);
        
        if (result.is_completed) {
          clearInterval(pollInterval);
          setPolling(false);
          toast({
            title: "Payment Confirmed!",
            description: "Your premium subscription is now active.",
          });
        } else if (result.status !== 'pending') {
          clearInterval(pollInterval);
          setPolling(false);
        }
      }
      
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setPolling(false);
        toast({
          title: "Payment Verification Timeout",
          description: "Payment is still processing. Please check back in a few minutes.",
          variant: "default"
        });
      }
    }, 2000);
  };

  if (loading) {
    return (
      <>
        <SEOHead 
          title="Payment Processing"
          description="Verifying your payment..."
        />
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Verifying your payment...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (error || !verification) {
    return (
      <>
        <SEOHead 
          title="Payment Verification Error"
          description="There was an issue verifying your payment"
        />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Payment Verification Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const isCompleted = verification.is_completed;

  return (
    <>
      <SEOHead 
        title={isCompleted ? "Payment Successful" : "Payment Processing"}
        description={isCompleted ? "Your premium subscription payment was successful" : "Your payment is being processed"}
      />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                {isCompleted ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : (
                  <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                )}
                <Crown className="h-6 w-6 text-amber-500 absolute -top-1 -right-1" />
              </div>
            </div>
            <CardTitle className={`text-2xl ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
              {isCompleted ? 'Payment Successful!' : 'Confirming your payment...'}
            </CardTitle>
            {polling && (
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we confirm your payment status
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-secondary rounded-lg p-4">
              <h3 className="font-semibold mb-3">Payment Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="ml-2 font-medium">
                    {convertFilsToAed(verification.amount_fils).toFixed(2)} {verification.currency}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`ml-2 font-medium ${
                    isCompleted ? 'text-green-600' : 
                    verification.status === 'pending' ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {verification.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="ml-2 font-mono text-xs">{verification.id}</span>
                </div>
              </div>
            </div>

            {/* Premium Benefits */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-amber-800 dark:text-amber-200">
                {isCompleted ? 'Premium Benefits Unlocked' : 'Premium Benefits'}
              </h3>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Unlock Premium Access — 40 AED/month • 20 AI Try-ons daily • Unlimited replica • UGC collabs</strong>
              </div>
            </div>

            {/* Action Buttons */}
            {!polling && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/toy-replica')}
                  className="flex-1"
                >
                  Try Toy Replica
                </Button>
              </div>
            )}

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Need help? Visit our{' '}
                <a href="/support" className="text-primary hover:underline">
                  support page
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
