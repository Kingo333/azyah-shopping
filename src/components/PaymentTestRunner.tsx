
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export function PaymentTestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Authentication Check
    const authTest = await testAuthentication();
    testResults.push(authTest);

    // Test 2: Payment Creation Test
    const paymentTest = await testPaymentCreation();
    testResults.push(paymentTest);

    setResults(testResults);
    setRunning(false);
  };

  const testAuthentication = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          name: 'Authentication Check',
          passed: false,
          duration: Date.now() - startTime,
          error: error.message
        };
      }

      return {
        name: 'Authentication Check',
        passed: !!session,
        duration: Date.now() - startTime,
        error: !session ? 'No active session found' : undefined
      };
    } catch (error) {
      return {
        name: 'Authentication Check',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const testPaymentCreation = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          name: 'Payment Creation',
          passed: false,
          duration: Date.now() - startTime,
          error: 'No active session for payment test'
        };
      }

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amountAed: 40,
          test: true,
          message: 'Test Payment'
        }
      });

      if (error) {
        return {
          name: 'Payment Creation',
          passed: false,
          duration: Date.now() - startTime,
          error: error.message
        };
      }

      const hasValidResponse = data?.redirectUrl && data?.pi;

      return {
        name: 'Payment Creation',
        passed: hasValidResponse,
        duration: Date.now() - startTime,
        error: !hasValidResponse ? 'Invalid payment response' : undefined
      };
    } catch (error) {
      return {
        name: 'Payment Creation',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const passRate = results.length > 0 ? 
    (results.filter(r => r.passed).length / results.length * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Payment System Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runTests} 
            disabled={running}
            className="flex items-center gap-2"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Run Tests
              </>
            )}
          </Button>

          {results.length > 0 && (
            <div className="bg-secondary/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Test Results</h3>
              <div className="text-2xl font-bold">{passRate}%</div>
              <div className="text-sm text-muted-foreground">
                {results.filter(r => r.passed).length}/{results.length} tests passed
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.passed)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.passed ? "default" : "destructive"}>
                        {result.passed ? "PASS" : "FAIL"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {result.duration}ms
                      </span>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      Error: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
