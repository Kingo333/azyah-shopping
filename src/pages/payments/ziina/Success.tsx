import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, Calendar, CreditCard, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';

interface PaymentVerification {
  payment_intent_id: string;
  status: string;
  amount: number;
  currency: string;
  is_completed: boolean;
  is_active: boolean;
  subscription_status: string;
  current_period_end: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch } = useSubscription();
  const { toast } = useToast();
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const paymentIntentId = searchParams.get('pi');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentIntentId || !user) {
        setError('Missing payment intent ID or user not authenticated');
        setLoading(false);
        return;
      }

      try {
        console.log('Verifying payment intent:', paymentIntentId);
        
        const { data, error: functionError } = await supabase.functions.invoke('verify-ziina-payment', {
          body: { payment_intent_id: paymentIntentId }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Failed to verify payment');
        }

        setVerification(data);
        
        if (data.is_completed) {
          toast({
            title: "Payment Successful!",
            description: "Your premium subscription has been activated.",
          });
          
          // Refresh subscription data
          await refetch();
        } else {
          toast({
            title: "Payment Verification",
            description: `Payment status: ${data.status}`,
            variant: data.status === 'failed' ? 'destructive' : 'default'
          });
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast({
          title: "Verification Error",
          description: "Failed to verify payment status",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentIntentId, user, refetch, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Verification Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error || 'Unable to verify payment'}</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Payment Successful - Azyah"
        description="Your premium subscription payment has been processed successfully."
      />
      
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                <Crown className="h-6 w-6" />
                Payment Successful!
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Welcome to Azyah Premium
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Details
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{verification.amount / 100} {verification.currency}</span>
                
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">Premium Shopper</span>
                
                <span className="text-muted-foreground">Payment ID:</span>
                <span className="font-mono text-xs break-all">{verification.payment_intent_id}</span>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Subscription Status
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${verification.is_active ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {verification.subscription_status}
                </span>
                
                {verification.current_period_end && (
                  <>
                    <span className="text-muted-foreground">Active until:</span>
                    <span className="font-medium">{formatDate(verification.current_period_end)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Premium Benefits */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg">
              <h3 className="font-semibold text-primary mb-3">Your Premium Benefits</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited AI Try-On sessions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Priority customer support
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Advanced personalization features
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Exclusive brand collaborations
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => navigate('/toy-replica')}
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Try Toy Replica
              </Button>
            </div>

            {/* Settings Link */}
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => navigate('/profile-settings')}
                className="text-sm text-muted-foreground"
              >
                Manage subscription settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PaymentSuccess;