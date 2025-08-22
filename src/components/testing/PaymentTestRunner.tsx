
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlayCircle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { runPaymentTests, type PaymentTestResult } from '@/utils/paymentTesting';
import { runZiinaE2ETest, logE2EResults, type E2ETestResult } from '@/utils/ziina-e2e-test';

export function PaymentTestRunner() {
  const [unitResults, setUnitResults] = useState<PaymentTestResult[]>([]);
  const [e2eResults, setE2EResults] = useState<E2ETestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [testMode, setTestMode] = useState(true);

  const runAllTests = async () => {
    setRunning(true);
    try {
      // Run unit tests
      console.log('🧪 Running unit tests...');
      const unitTestResults = await runPaymentTests();
      setUnitResults(unitTestResults);

      // Run E2E tests
      console.log('🧪 Running E2E tests...');
      const e2eTestResults = await runZiinaE2ETest(testMode);
      setE2EResults(e2eTestResults);
      logE2EResults(e2eTestResults);

    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  const unitPassRate = unitResults.length > 0 ? 
    (unitResults.filter(r => r.passed).length / unitResults.length * 100).toFixed(1) : '0';

  const e2ePassRate = e2eResults.length > 0 ? 
    (e2eResults.filter(r => r.success).length / e2eResults.length * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Ziina Payment Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runAllTests} 
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
                  Run All Tests
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Test Mode:</label>
              <input 
                type="checkbox" 
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-muted-foreground">
                {testMode ? 'Enabled (no charges)' : 'Live mode'}
              </span>
            </div>
          </div>

          {/* Test Results Summary */}
          {(unitResults.length > 0 || e2eResults.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-secondary/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Unit Tests</h3>
                <div className="text-2xl font-bold">{unitPassRate}%</div>
                <div className="text-sm text-muted-foreground">
                  {unitResults.filter(r => r.passed).length}/{unitResults.length} passed
                </div>
              </div>
              
              <div className="bg-secondary/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">E2E Tests</h3>
                <div className="text-2xl font-bold">{e2ePassRate}%</div>
                <div className="text-sm text-muted-foreground">
                  {e2eResults.filter(r => r.success).length}/{e2eResults.length} passed
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unit Test Results */}
      {unitResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unit Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unitResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.passed)}
                    <span className="font-medium">{result.testName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(result.passed)}
                    <span className="text-sm text-muted-foreground">
                      {result.duration}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* E2E Test Results */}
      {e2eResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>End-to-End Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {e2eResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.success)}
                      <span className="font-medium">{result.step}</span>
                    </div>
                    {getStatusBadge(result.success)}
                  </div>
                  
                  {result.data && (
                    <div className="mt-2 p-2 bg-secondary/20 rounded text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
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

      {running && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Running tests... Check console for detailed logs</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
