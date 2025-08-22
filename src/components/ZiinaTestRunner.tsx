
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { runZiinaTests, type TestResult } from '@/utils/ziinaTests';

export function ZiinaTestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    try {
      const testResults = await runZiinaTests();
      setResults(testResults);
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

  const passRate = results.length > 0 ? 
    (results.filter(r => r.passed).length / results.length * 100).toFixed(1) : '0';

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
                Run All Tests
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
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
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
                  
                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      Error: {result.error}
                    </div>
                  )}
                  
                  {result.details && (
                    <div className="mt-2 p-2 bg-secondary/20 rounded text-sm">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
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
