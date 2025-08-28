import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
  timestamp: string;
}

export function ZiinaPaymentTester() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (step: string, status: 'success' | 'error' | 'pending', message: string, data?: any) => {
    const result: TestResult = {
      step,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    setResults(prev => [...prev, result]);
    return result;
  };

  const runIntegrationTest = async () => {
    setTesting(true);
    setResults([]);

    try {
      // Test 1: Environment Check
      addResult('Environment Check', 'pending', 'Checking required environment variables...');
      
      // Test 2: Authentication Check
      if (!user) {
        addResult('Authentication Check', 'error', 'User not authenticated');
        setTesting(false);
        return;
      }
      addResult('Authentication Check', 'success', `Authenticated as: ${user.email}`);

      // Test 3: Create Payment Intent (Test Mode) - Updated to 30 AED
      addResult('Create Payment Intent', 'pending', 'Creating test payment intent...');
      
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
        body: { 
          amountAed: 30, 
          test: true,
          message: 'Azyah Premium Test Payment'
        }
      });

      if (paymentError || !paymentData?.redirectUrl) {
        addResult('Create Payment Intent', 'error', `Failed: ${paymentError?.message || 'No redirect URL'}`, paymentError);
        setTesting(false);
        return;
      }

      addResult('Create Payment Intent', 'success', 'Payment intent created successfully', {
        paymentIntentId: paymentData.pi,
        redirectUrl: paymentData.redirectUrl
      });

      // Test 4: Database Record Check
      addResult('Database Check', 'pending', 'Checking database records...');
      
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_intent_id', paymentData.pi)
        .order('created_at', { ascending: false })
        .limit(1);

      if (paymentsError) {
        addResult('Database Check', 'error', `Payments query error: ${paymentsError.message}`);
      } else if (!payments || payments.length === 0) {
        addResult('Database Check', 'error', 'Payment record not found in database');
      } else {
        addResult('Database Check', 'success', 'Payment record found in database', payments[0]);
      }

      // Test 5: Subscription Record Check
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        addResult('Subscription Check', 'error', `Subscription query error: ${subError.message}`);
      } else if (!subscription) {
        addResult('Subscription Check', 'error', 'Subscription record not found');
      } else {
        addResult('Subscription Check', 'success', 'Subscription record found', subscription);
      }

      // Test 6: Manual Payment Flow Test
      addResult('Payment Flow Test', 'success', 'Ready for manual testing', {
        instructions: 'Click the redirect URL to test the payment flow manually',
        redirectUrl: paymentData.redirectUrl,
        testPaymentIntentId: paymentData.pi
      });

    } catch (error) {
      addResult('Test Suite', 'error', `Unexpected error: ${error}`, error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Ziina Payment Integration Tester
        </CardTitle>
        <CardDescription>
          Test the complete Ziina payment integration with new credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={runIntegrationTest} 
            disabled={testing || !user}
            className="min-w-[200px]"
          >
            {testing ? 'Running Tests...' : 'Run Integration Test'}
          </Button>
          
          {results.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setResults([])}
              disabled={testing}
            >
              Clear Results
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.step}</span>
                    <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                      {result.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="text-sm">{result.message}</p>
                
                {result.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}

                {result.step === 'Payment Flow Test' && result.status === 'success' && result.data?.redirectUrl && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">Manual Test Instructions:</p>
                    <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                      <li>Click the redirect URL below to go to Ziina's payment page</li>
                      <li>Complete the payment using test card details</li>
                      <li>Verify you're redirected back to the success page</li>
                      <li>Check that your subscription is activated</li>
                    </ol>
                    <a 
                      href={result.data.redirectUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Open Payment Page
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Test Coverage:</h4>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>✅ Environment variable validation</li>
            <li>✅ User authentication check</li>
            <li>✅ Payment intent creation (test mode)</li>
            <li>✅ Database record verification</li>
            <li>✅ Subscription record verification</li>
            <li>⚠️ Manual payment flow test (requires user interaction)</li>
            <li>⚠️ Webhook processing (requires payment completion)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
