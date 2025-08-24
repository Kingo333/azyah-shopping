import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { SEOHead } from '@/components/SEOHead';
import { clearPaymentSessionBackup, getPaymentSessionBackup } from '@/utils/paymentSessionManager';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentIntentId = searchParams.get('payment_intent_id');
  const [countdown, setCountdown] = useState(4);
  const [navigating, setNavigating] = useState(false);
  const { createPaymentIntent, loading } = useSubscription();
  const { user, session } = useAuth();

  useEffect(() => {
    console.log('PaymentCancel: Starting 4-second countdown');
    
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

    // Delay clearing payment session backup to allow auth recovery
    const clearTimer = setTimeout(() => {
      clearPaymentSessionBackup();
    }, 5000);
    
    const redirectTimer = setInterval(() => {
      setCountdown((prev) => {
        console.log('PaymentCancel countdown:', prev - 1);
        if (prev <= 1) {
          console.log('PaymentCancel: Countdown finished, navigating to dashboard');
          handleNavigateToDashboard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('PaymentCancel: Cleaning up timers');
      clearTimeout(clearTimer);
      clearInterval(redirectTimer);
    };
  }, [navigate]);

  const handleNavigateToDashboard = async () => {
    setNavigating(true);
    console.log('PaymentCancel: Navigating to dashboard');
    
    // Clear the current page title before navigation
    document.title = 'Azyah';
    
    // Ensure we have a valid session before navigating
    if (!session || !user) {
      const backup = getPaymentSessionBackup();
      if (backup) {
        try {
          await supabase.auth.setSession({
            access_token: backup.session.access_token,
            refresh_token: backup.session.refresh_token
          });
          // Wait a moment for the auth state to update
          setTimeout(() => {
            navigate('/dashboard');
          }, 100);
          return;
        } catch (error) {
          console.error('Failed to restore session:', error);
        }
      }
    }
    
    navigate('/dashboard');
  };

  const handleRetryPayment = async () => {
    await createPaymentIntent(false);
  };

  return (
    <>
      <SEOHead 
        title="Azyah"
        description="Your payment was canceled"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Payment Canceled</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {paymentIntentId && (
              <p className="text-sm text-muted-foreground">
                Payment ID: {paymentIntentId}
              </p>
            )}
            
            <p className="text-muted-foreground">
              Your payment was canceled and no charges have been made.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Why upgrade to Premium?</h3>
              <ul className="text-sm text-left space-y-1">
                <li>• AI virtual try-on technology</li>
                <li>• Advanced product filtering</li>
                <li>• Exclusive designer collections</li>
                <li>• Priority customer support</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in {countdown} seconds...
            </p>

            <div className="space-y-2">
              <Button 
                onClick={handleNavigateToDashboard}
                variant="outline"
                className="w-full"
                disabled={navigating}
              >
                {navigating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Back to Dashboard'
                )}
              </Button>
              
              <Button 
                onClick={handleRetryPayment}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Try Again'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Need help? <a href="/support" className="text-primary hover:underline">Contact Support</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}