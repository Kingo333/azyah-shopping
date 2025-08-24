import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, XCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SEOHead } from '@/components/SEOHead';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { clearPaymentSessionBackup, getPaymentSessionBackup } from '@/utils/paymentSessionManager';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const paymentIntentId = searchParams.get('payment_intent_id');
  const canceled = searchParams.get('canceled');
  const [countdown, setCountdown] = useState(4);
  const [navigating, setNavigating] = useState(false);
  const { createPaymentIntent, loading } = useSubscription();
  
  // Determine if this was a cancellation or failure
  const isCanceled = canceled === 'true' || window.location.pathname.includes('/payment-cancel');

  useEffect(() => {
    // Try to restore session from backup if missing
    const restoreSession = async () => {
      if (!session || !user) {
        const backup = getPaymentSessionBackup();
        if (backup) {
          try {
            await supabase.auth.setSession({
              access_token: backup.session.access_token,
              refresh_token: backup.session.refresh_token
            });
          } catch (error) {
            console.error('Failed to restore session from backup:', error);
          }
        }
      }
    };

    restoreSession();

    // Clear payment session backup after a delay
    const clearTimer = setTimeout(() => {
      clearPaymentSessionBackup();
    }, 2000);

    // Auto-redirect timer
    const redirectTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(clearTimer);
      clearInterval(redirectTimer);
    };
  }, [navigate, session, user]);

  const handleNavigateToDashboard = async () => {
    setNavigating(true);
    
    // Try to restore session if missing
    if (!session || !user) {
      const backup = getPaymentSessionBackup();
      if (backup) {
        try {
          await supabase.auth.setSession({
            access_token: backup.session.access_token,
            refresh_token: backup.session.refresh_token
          });
        } catch (error) {
          console.error('Failed to restore session:', error);
        }
      }
    }
    
    navigate('/');
  };

  const handleRetryPayment = async () => {
    await createPaymentIntent(false);
  };

  return (
    <>
      <SEOHead 
        title={isCanceled ? "Payment Cancelled - Azyah - Fashion Discovery Platform" : "Payment Failed - Azyah - Fashion Discovery Platform"}
        description={isCanceled ? "Your payment was cancelled" : "Your payment failed to process"}
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isCanceled ? (
                <XCircle className="w-12 h-12 text-orange-500" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isCanceled ? 'Payment Cancelled' : 'Payment Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {paymentIntentId && (
              <p className="text-sm text-muted-foreground">
                Payment ID: {paymentIntentId}
              </p>
            )}
            
            <p className="text-muted-foreground">
              {isCanceled 
                ? "Your payment was cancelled. You can try again when you're ready to upgrade to premium."
                : "We couldn't process your payment. Please try again or use a different payment method."
              }
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

            {isCanceled && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-sm">Premium Features Include:</h3>
                <ul className="text-sm text-left space-y-1">
                  <li>• Unlimited swipes and likes</li>
                  <li>• Advanced AI styling recommendations</li>
                  <li>• Priority customer support</li>
                  <li>• Exclusive brand collaborations</li>
                </ul>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in {countdown} seconds...
            </p>

            <div className="space-y-2">
              <Button 
                onClick={handleNavigateToDashboard}
                disabled={navigating}
                variant="outline"
                className="w-full"
              >
                {navigating ? 'Loading...' : 'Back to Dashboard'}
              </Button>
              
              <Button 
                onClick={handleRetryPayment}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : (isCanceled ? 'Upgrade to Premium' : 'Try Again')}
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