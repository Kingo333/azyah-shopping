import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

interface PaymentVerification {
  payment_intent_id: string;
  status: string;
  amount: number;
  currency: string;
  is_completed: boolean;
  is_active: boolean;
  subscription_status: string;
  current_period_end?: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch } = useSubscription();
  const { toast } = useToast();
  
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentIntentId = searchParams.get('payment_intent_id');

  useEffect(() => {
    if (paymentIntentId && user) {
      verifyPayment();
    } else {
      setError('Missing payment information');
      setLoading(false);
    }
  }, [paymentIntentId, user]);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { payment_intent_id: paymentIntentId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Payment verification error:', error);
        setError(error.message || 'Failed to verify payment');
        toast({
          title: "Verification Error",
          description: "Could not verify your payment. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      setVerification(data);
      
      if (data.is_completed) {
        toast({
          title: "Payment Successful!",
          description: "Your premium subscription is now active.",
        });
        // Refresh subscription data
        await refetch();
      } else {
        toast({
          title: "Payment Pending",
          description: "Your payment is being processed.",
          variant: "destructive"
        });
      }

    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: "Verification Failed",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
              <p className="text-muted-foreground">
                {error || 'Could not verify your payment'}
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="Payment Successful"
        description="Your premium subscription payment was successful"
      />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <Crown className="h-6 w-6 text-amber-500 absolute -top-1 -right-1" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-secondary rounded-lg p-4">
              <h3 className="font-semibold mb-3">Payment Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="ml-2 font-medium">
                    {verification.amount / 100} {verification.currency}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="ml-2 font-medium">Premium Subscription</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="ml-2 font-mono text-xs">{verification.payment_intent_id}</span>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">
                Subscription Status
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium capitalize">
                    {verification.subscription_status}
                  </span>
                </div>
                {verification.current_period_end && (
                  <div>
                    <span className="text-muted-foreground">Active until:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(verification.current_period_end)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Benefits */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-amber-800 dark:text-amber-200">
                Premium Benefits Unlocked
              </h3>
              <ul className="text-sm space-y-1 text-amber-700 dark:text-amber-300">
                <li>• AI-powered toy replica generation</li>
                <li>• Advanced fashion recommendations</li>
                <li>• Unlimited AI try-on sessions</li>
                <li>• Priority customer support</li>
                <li>• Exclusive premium content</li>
              </ul>
            </div>

            {/* Action Buttons */}
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

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Need help? Visit our{' '}
                <a href="/support" className="text-primary hover:underline">
                  support page
                </a>{' '}
                or{' '}
                <a href="/profile-settings" className="text-primary hover:underline">
                  manage your subscription
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}