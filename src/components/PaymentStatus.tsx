
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PaymentButton } from './PaymentButton';

export function PaymentStatus() {
  const { toast } = useToast();
  const [webhookLoading, setWebhookLoading] = useState(false);

  const integrationComponents = [
    {
      component: "Payment Intent Creation",
      status: "ready",
      description: "Create payment intents with Ziina API (40 AED = 4000 fils)"
    },
    {
      component: "Payment Verification",
      status: "ready", 
      description: "Verify payment status with polling for pending payments"
    },
    {
      component: "Success Page",
      status: "ready", 
      description: "/payments/ziina/success with payment verification & polling"
    },
    {
      component: "Cancel Page",
      status: "ready",
      description: "/payments/ziina/cancel for cancelled payments"
    },
    {
      component: "Failed Page",
      status: "ready",
      description: "/payments/ziina/failure for failed payments"
    },
    {
      component: "Webhook Handler",
      status: "ready",
      description: "Processes Ziina payment notifications with HMAC & IP verification"
    },
    {
      component: "Refund Support",
      status: "ready",
      description: "Admin-only refund details via GET /refund/{id}"
    }
  ];

  const configuredUrls = [
    {
      label: "Success URL",
      url: `${window.location.origin}/payments/ziina/success?pi={PAYMENT_INTENT_ID}`,
      status: "configured"
    },
    {
      label: "Cancel URL", 
      url: `${window.location.origin}/payments/ziina/cancel?pi={PAYMENT_INTENT_ID}`,
      status: "configured"
    },
    {
      label: "Failed URL",
      url: `${window.location.origin}/payments/ziina/failure?pi={PAYMENT_INTENT_ID}`,
      status: "configured"
    },
    {
      label: "Webhook URL",
      url: `https://klwolsopucgswhtdlsps.supabase.co/functions/v1/payment-webhook`,
      status: "configured"
    }
  ];

  const handleRegisterWebhook = async () => {
    try {
      setWebhookLoading(true);
      
      const { data, error } = await supabase.functions.invoke('register-webhook', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Webhook registration error:', error);
        toast({
          title: "Webhook Registration Failed",
          description: error.message || 'Failed to register webhook',
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Webhook Registered",
        description: "Successfully registered webhook with Ziina",
      });

    } catch (err) {
      console.error('Webhook registration error:', err);
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setWebhookLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Ziina Payment Integration Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrationComponents.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.component}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Badge variant={item.status === 'ready' ? 'default' : 'secondary'}>
                {item.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Premium Copy Display */}
      <Card>
        <CardHeader>
          <CardTitle>Premium Subscription Copy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
            <p className="text-amber-800 dark:text-amber-200 font-medium">
              "Unlock Premium Access — 40 AED/month • 20 AI Try-ons daily • Unlimited replica • UGC collabs"
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              This exact copy is used in checkout & receipt pages as specified.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configured URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Flow URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {configuredUrls.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono break-all">
                {item.url}
              </p>
              {index < configuredUrls.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Test Payment Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div className="space-y-2 flex-1">
                <p className="font-medium">Register webhook with Ziina</p>
                <p className="text-muted-foreground text-sm">
                  Register your webhook URL to receive payment notifications
                </p>
                <Button 
                  onClick={handleRegisterWebhook}
                  disabled={webhookLoading}
                  size="sm"
                >
                  {webhookLoading ? 'Registering...' : 'Register Webhook'}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div className="space-y-2 flex-1">
                <p className="font-medium">Test the payment flow</p>
                <p className="text-muted-foreground text-sm">
                  Test both sandbox and live payment processing (40 AED = 4000 fils)
                </p>
                <div className="flex gap-2">
                  <PaymentButton test={true} size="sm">
                    Test Payment (Sandbox)
                  </PaymentButton>
                  <PaymentButton test={false} size="sm">
                    Live Payment (40 AED)
                  </PaymentButton>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div className="space-y-2 flex-1">
                <p className="font-medium">Verify complete flow</p>
                <p className="text-muted-foreground text-sm">
                  Test create → pay → webhook → verify → premium activation
                </p>
                <div className="text-xs text-muted-foreground">
                  • Success page polls for 30s on pending payments<br/>
                  • Webhook verifies HMAC signature & IP allowlist<br/>
                  • Premium copy displayed verbatim on success
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
