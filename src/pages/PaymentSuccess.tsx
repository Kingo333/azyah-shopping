import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, refetch } = useSubscription();
  const [searchParams] = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent_id');
  const [hasRefetched, setHasRefetched] = useState(false);

  useEffect(() => {
    // Refetch subscription data after successful payment
    if (user && !hasRefetched) {
      setTimeout(() => {
        refetch();
        setHasRefetched(true);
      }, 2000); // Small delay to ensure webhook has processed
    }
  }, [user, refetch, hasRefetched]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const isPremiumActive = subscription && 
    (subscription.status === 'active' || subscription.status === 'canceled') &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) >= new Date();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-green-900 dark:text-green-100 flex items-center justify-center gap-2">
                <Crown className="h-6 w-6" />
                Payment Successful!
              </CardTitle>
              <p className="text-green-700 dark:text-green-300 mt-2">
                Welcome to Premium Shopper
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-white dark:bg-gray-900/30 rounded-lg p-4 border">
              <h3 className="font-semibold text-foreground mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium">40 AED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">Premium Shopper</span>
                </div>
                {paymentIntentId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID:</span>
                    <span className="font-mono text-xs">{paymentIntentId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-white dark:bg-gray-900/30 rounded-lg p-4 border">
              <h3 className="font-semibold text-foreground mb-3">Subscription Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={isPremiumActive ? "default" : "secondary"} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    {isPremiumActive ? 'Active' : 'Processing...'}
                  </Badge>
                </div>
                {subscription?.current_period_end && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Until:</span>
                    <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Benefits */}
            <div className="bg-white dark:bg-gray-900/30 rounded-lg p-4 border">
              <h3 className="font-semibold text-foreground mb-3">Premium Benefits Unlocked</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Unlimited Toy Replica generations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Full access to all premium features</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Priority customer support</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/toy-replica')}
                className="flex-1"
              >
                Try Toy Replica
              </Button>
            </div>

            {/* Next Steps */}
            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              <p>
                Your premium subscription is now active! You can manage your subscription in 
                <Button variant="link" className="px-1 h-auto text-sm" onClick={() => navigate('/settings')}>
                  Profile Settings
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;