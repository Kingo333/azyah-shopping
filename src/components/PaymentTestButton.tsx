import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { TestTube2, CreditCard, Webhook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PaymentTestButton: React.FC = () => {
  const { createPaymentIntent, loading } = useSubscription();
  const { toast } = useToast();
  const [testMode, setTestMode] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const handleTestPayment = async () => {
    try {
      setTestMode(true);
      console.log('Starting test payment...');
      
      // Create a test payment intent
      await createPaymentIntent(true);
      
      toast({
        title: "Test Payment Initiated",
        description: "You should be redirected to Ziina's test payment page",
      });
    } catch (error) {
      console.error('Test payment error:', error);
      toast({
        title: "Test Payment Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setTestMode(false);
    }
  };

  const handleRealPayment = async () => {
    try {
      console.log('Starting real payment...');
      await createPaymentIntent(false);
      
      toast({
        title: "Payment Initiated",
        description: "You should be redirected to Ziina's payment page",
      });
    } catch (error) {
      console.error('Real payment error:', error);
      toast({
        title: "Payment Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleRegisterWebhook = async () => {
    try {
      setWebhookLoading(true);
      console.log('Registering Ziina webhook...');
      
      const { data, error } = await supabase.functions.invoke('register-ziina-webhook', {
        method: 'POST',
        body: {}
      });

      if (error) {
        throw error;
      }

      console.log('Webhook registration response:', data);
      
      toast({
        title: "Webhook Registered Successfully",
        description: `Webhook URL: ${data.webhook_url}`,
      });
    } catch (error) {
      console.error('Webhook registration error:', error);
      toast({
        title: "Webhook Registration Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setWebhookLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Ziina Payment Integration</h3>
      
      {/* Webhook Registration */}
      <div className="border-b pb-4">
        <h4 className="text-md font-medium mb-2">Step 1: Register Webhook</h4>
        <Button
          onClick={handleRegisterWebhook}
          disabled={webhookLoading}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {webhookLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Webhook className="h-4 w-4 mr-2" />
          )}
          Register Webhook with Ziina
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          This registers your webhook URL with Ziina to receive payment notifications
        </p>
      </div>

      {/* Payment Testing */}
      <div>
        <h4 className="text-md font-medium mb-2">Step 2: Test Payment Flow</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleTestPayment}
            disabled={loading || testMode}
            variant="outline"
            className="flex-1"
          >
            {testMode ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <TestTube2 className="h-4 w-4 mr-2" />
            )}
            Test Payment (No Charge)
          </Button>
          
          <Button
            onClick={handleRealPayment}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-accent to-accent-cartier"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Real Payment (40 AED)
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1 mt-2">
          <p><strong>Test Payment:</strong> Use any card details, no money charged</p>
          <p><strong>Real Payment:</strong> Actual payment of 40 AED for premium access</p>
        </div>
      </div>

      {/* URL Information */}
      <div className="bg-muted/50 p-3 rounded text-sm">
        <h5 className="font-medium mb-2">Integration URLs:</h5>
        <div className="space-y-1 text-xs">
          <p><strong>Success:</strong> https://azyahstyle.com/payments/ziina/success</p>
          <p><strong>Cancel:</strong> https://azyahstyle.com/payments/ziina/cancel</p>
          <p><strong>Failed:</strong> https://azyahstyle.com/payments/ziina/failed</p>
          <p><strong>Webhook:</strong> https://klwolsopucgswhtdlsps.supabase.co/functions/v1/ziina-webhook</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentTestButton;