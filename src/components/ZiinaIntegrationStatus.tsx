import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export const ZiinaIntegrationStatus = () => {
  const integrationStatus = [
    {
      component: "Payment Intent Creation",
      status: "ready",
      description: "Edge function creates payment intents with proper URLs"
    },
    {
      component: "Success Page",
      status: "ready", 
      description: "/payments/ziina/success with payment verification"
    },
    {
      component: "Cancel Page",
      status: "ready",
      description: "/payments/ziina/cancel for cancelled payments"
    },
    {
      component: "Failed Page", 
      status: "ready",
      description: "/payments/ziina/failed for failed payments"
    },
    {
      component: "Webhook Handler",
      status: "ready",
      description: "HMAC verification and subscription updates"
    },
    {
      component: "Database Integration",
      status: "ready",
      description: "Subscription table with proper RLS policies"
    },
    {
      component: "Webhook Registration",
      status: "pending",
      description: "Click 'Register Webhook' button to complete"
    }
  ];

  const urls = [
    {
      label: "Success URL",
      url: "https://azyahstyle.com/payments/ziina/success?pi={PAYMENT_INTENT_ID}",
      status: "configured"
    },
    {
      label: "Cancel URL", 
      url: "https://azyahstyle.com/payments/ziina/cancel?pi={PAYMENT_INTENT_ID}",
      status: "configured"
    },
    {
      label: "Failure URL",
      url: "https://azyahstyle.com/payments/ziina/failed?pi={PAYMENT_INTENT_ID}",
      status: "configured"
    },
    {
      label: "Webhook URL",
      url: "https://klwolsopucgswhtdlsps.supabase.co/functions/v1/ziina-webhook",
      status: "configured"
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Ziina Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrationStatus.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{item.component}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge 
                  variant={item.status === "ready" ? "default" : "secondary"}
                  className={item.status === "ready" ? "bg-green-100 text-green-800" : ""}
                >
                  {item.status === "ready" ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {urls.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.label}</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {item.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {item.url}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">1</span>
              <div>
                <p className="font-medium">Set APP_DASHBOARD_URL secret</p>
                <p className="text-muted-foreground">Set to: https://azyahstyle.com</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">2</span>
              <div>
                <p className="font-medium">Register webhook with Ziina</p>
                <p className="text-muted-foreground">Click the "Register Webhook" button below</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">3</span>
              <div>
                <p className="font-medium">Configure Ziina Dashboard</p>
                <p className="text-muted-foreground">Set "App Dashboard URL" to: https://azyahstyle.com/dashboard (optional)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">4</span>
              <div>
                <p className="font-medium">Test the payment flow</p>
                <p className="text-muted-foreground">Use the test payment button to verify everything works</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZiinaIntegrationStatus;