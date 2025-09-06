import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Network } from 'lucide-react';

interface NetworkRequest {
  url: string;
  isValid: boolean;
  timestamp: number;
}

export const NetworkVerification: React.FC = () => {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = () => {
    setIsMonitoring(true);
    setRequests([]);

    // Override fetch to monitor requests
    const originalFetch = window.fetch;
    const monitoredRequests: NetworkRequest[] = [];

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Check if this is a Supabase-related request
      if (url.includes('supabase') || url.includes('api.azyahstyle.com')) {
        const isValid = url.includes('api.azyahstyle.com') && !url.includes('supabase.co');
        monitoredRequests.push({
          url,
          isValid,
          timestamp: Date.now()
        });
        setRequests([...monitoredRequests]);
      }

      return originalFetch(input, init);
    };

    // Auto-stop monitoring after 30 seconds
    setTimeout(() => {
      window.fetch = originalFetch;
      setIsMonitoring(false);
    }, 30000);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    // Restore original fetch
    location.reload();
  };

  const hasInvalidRequests = requests.some(req => !req.isValid);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            <CardTitle>Network Verification</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={startMonitoring} 
              disabled={isMonitoring}
              variant={isMonitoring ? "secondary" : "default"}
            >
              {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
            </Button>
            {isMonitoring && (
              <Button onClick={stopMonitoring} variant="outline">
                Stop
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Monitor network requests to ensure all Supabase calls use https://api.azyahstyle.com
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasInvalidRequests && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ❌ Found requests to *.supabase.co domains! The proxy is not working correctly.
            </AlertDescription>
          </Alert>
        )}

        {requests.length > 0 && !hasInvalidRequests && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ All Supabase requests are correctly using the proxy domain.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Monitored Requests ({requests.length})</h4>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {requests.map((request, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                <span className="font-mono text-xs truncate flex-1 mr-2">
                  {request.url}
                </span>
                <Badge variant={request.isValid ? "default" : "destructive"}>
                  {request.isValid ? '✅' : '❌'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {requests.length === 0 && !isMonitoring && (
          <div className="text-center text-muted-foreground py-8">
            Click "Start Monitoring" then navigate around the app to verify all requests use the proxy
          </div>
        )}
      </CardContent>
    </Card>
  );
};