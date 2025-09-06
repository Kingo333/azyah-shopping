import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Wifi, Database, Key, Trash2 } from 'lucide-react';
import { NetworkVerification } from './NetworkVerification';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  statusCode?: number;
  response?: any;
  error?: string;
  responseTime?: number;
}

export const DebugHealthPage: React.FC = () => {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const endpoints = [
    {
      name: 'Auth Health',
      endpoint: '/auth/v1/health',
      icon: <Key className="h-4 w-4" />
    },
    {
      name: 'REST API',
      endpoint: '/rest/v1/products?select=id&limit=1',
      icon: <Database className="h-4 w-4" />
    },
    {
      name: 'Storage Health',
      endpoint: '/storage/v1/bucket',
      icon: <Database className="h-4 w-4" />
    },
    {
      name: 'Functions Health',
      endpoint: '/functions/v1/health',
      icon: <Wifi className="h-4 w-4" />
    }
  ];

  const runHealthCheck = async () => {
    setIsRunning(true);
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    console.log('Health check using base URL:', baseUrl);
    
    const newResults: HealthCheckResult[] = [];

    for (const endpoint of endpoints) {
      const fullUrl = `${baseUrl}${endpoint.endpoint}`;
      const startTime = performance.now();
      
      try {
        const response = await fetch(fullUrl, {
          headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        let responseData;
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }

        newResults.push({
          endpoint: endpoint.endpoint,
          status: response.ok ? 'success' : 'error',
          statusCode: response.status,
          response: responseData,
          responseTime
        });
      } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        newResults.push({
          endpoint: endpoint.endpoint,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime
        });
      }
    }

    setResults(newResults);
    setIsRunning(false);
  };

  const resetApp = async () => {
    if (!confirm('This will clear all app data and reload the page. Continue?')) {
      return;
    }
    
    try {
      console.log('🔄 Resetting app...');
      
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log('Unregistering SW:', registration.scope);
          await registration.unregister();
        }
      }
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      console.log('Cleared localStorage and sessionStorage');
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('Clearing caches:', cacheNames);
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Force hard reload
      window.location.reload();
    } catch (error) {
      console.error('Error resetting app:', error);
      alert(`Error resetting app: ${error}. Try manually clearing browser data in Settings.`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debug Health Check</h1>
          <p className="text-muted-foreground">Test proxy connectivity and app state</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runHealthCheck} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
          {import.meta.env.DEV && (
            <Button 
              onClick={resetApp}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Reset App
            </Button>
          )}
        </div>
      </div>

        <Alert>
        <Wifi className="h-4 w-4" />
        <AlertDescription>
          <strong>Base URL:</strong> {import.meta.env.VITE_SUPABASE_URL}
          <br />
          <strong>Using Proxy:</strong> {import.meta.env.VITE_SUPABASE_URL?.includes('api.azyahstyle.com') ? '✅ Yes' : '❌ No'}
        </AlertDescription>
      </Alert>

      <NetworkVerification />

      <div className="grid gap-4">
        {endpoints.map((endpoint, index) => {
          const result = results.find(r => r.endpoint === endpoint.endpoint);
          
          return (
            <Card key={endpoint.endpoint}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {endpoint.icon}
                    <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                  </div>
                  {result && (
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={result.status === 'success' ? 'default' : 'destructive'}
                        className={getStatusColor(result.status)}
                      >
                        {result.statusCode || result.status}
                      </Badge>
                      {result.responseTime && (
                        <span className="text-sm text-muted-foreground">
                          {result.responseTime}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <CardDescription>
                  {import.meta.env.VITE_SUPABASE_URL}{endpoint.endpoint}
                </CardDescription>
              </CardHeader>
              {result && (
                <CardContent>
                  {result.error ? (
                    <div className="text-red-600 text-sm font-mono">
                      Error: {result.error}
                    </div>
                  ) : (
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Network Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Tests:</span> {results.length}
              </div>
              <div>
                <span className="font-medium">Successful:</span> {results.filter(r => r.status === 'success').length}
              </div>
              <div>
                <span className="font-medium">Failed:</span> {results.filter(r => r.status === 'error').length}
              </div>
              <div>
                <span className="font-medium">Avg Response:</span> {
                  results.length > 0 
                    ? Math.round(results.reduce((acc, r) => acc + (r.responseTime || 0), 0) / results.length)
                    : 0
                }ms
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};