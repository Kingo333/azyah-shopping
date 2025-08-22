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
      description: "Create payment intents with proper URLs"
    },
    {
      component: "Success Page",
      status: "ready", 
      description: "/payment-success with payment verification"
    },
    {
      component: "Cancel Page",
      status: "ready",
      description: "/payment-cancel for cancelled payments"
    },
    {
      component: "Failed Page",
      status: "ready",
      description: "/payment-failed for failed payments"
    },
    {
      component: "Webhook Handler",
      status: "ready",
      description: "Processes payment status updates"
    }
  ];

  const configuredUrls = [
    {
      label: "Success URL",
      url: `${window.location.origin}/payment-success?payment_intent_id={PAYMENT_INTENT_ID}`,
      status: "configured"
    },
    {
      label: "Cancel URL", 
      url: `${window.location.origin}/payment-cancel?payment_intent_id={PAYMENT_INTENT_ID}`,
      status: "configured"
    },
    {
      label: "Failed URL",
      url: `${window.location.origin}/payment-failed?payment_intent_id={PAYMENT_INTENT_ID}`,
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
          <CardTitle className="flex items-center gap-2">
            Ziina Payment Integration Status
          </CardTitle>
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

      {/* Configured URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Configured URLs</CardTitle>
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

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Steps</CardTitle>
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
                  This registers your webhook URL with Ziina to receive payment notifications
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
                  Use the test payment button to verify everything works correctly
                </p>
                <div className="flex gap-2">
                  <PaymentButton test={true} size="sm">
                    Test Payment (Free)
                  </PaymentButton>
                  <PaymentButton test={false} size="sm">
                    Real Payment (40 AED)
                  </PaymentButton>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div className="space-y-2 flex-1">
                <p className="font-medium">Configure Ziina Dashboard URLs</p>
                <p className="text-muted-foreground text-sm">
                  In your Ziina dashboard, configure the URLs shown above for your application
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}