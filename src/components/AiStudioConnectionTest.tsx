
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';

const AiStudioConnectionTest: React.FC = () => {
  const { healthCheck, loading } = useBitStudio();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setErrorMessage('');
    
    try {
      const isHealthy = await healthCheck();
      setConnectionStatus(isHealthy ? 'connected' : 'disconnected');
      setLastChecked(new Date());
      
      if (!isHealthy) {
        setErrorMessage('BitStudio API is not responding properly');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Unknown error occurred');
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wifi className="h-5 w-5" />
          AI Studio Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">BitStudio API</span>
          </div>
          {getStatusBadge()}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {lastChecked && (
          <p className="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}

        <Button 
          onClick={checkConnection}
          disabled={loading || connectionStatus === 'checking'}
          size="sm"
          className="w-full"
        >
          {loading || connectionStatus === 'checking' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>

        {connectionStatus === 'connected' && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm text-green-700">
              ✅ AI Studio is properly connected and ready to use!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AiStudioConnectionTest;
