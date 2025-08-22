import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { TestTube2, CreditCard } from 'lucide-react';

const PaymentTestButton: React.FC = () => {
  const { createPaymentIntent, loading } = useSubscription();
  const { toast } = useToast();
  const [testMode, setTestMode] = useState(false);

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

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Payment Testing</h3>
      
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
      
      <div className="text-sm text-muted-foreground space-y-1">
        <p><strong>Test Payment:</strong> Use any card details, no money charged</p>
        <p><strong>Real Payment:</strong> Actual payment of 40 AED for premium access</p>
      </div>
    </div>
  );
};

export default PaymentTestButton;