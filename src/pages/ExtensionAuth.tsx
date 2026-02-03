import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Chrome } from 'lucide-react';

// Declare chrome types for TypeScript
declare const chrome: {
  runtime: {
    sendMessage: (
      extensionId: string,
      message: unknown,
      callback: (response: { success: boolean; error?: string }) => void
    ) => void;
    lastError?: { message: string };
  };
} | undefined;

type AuthStatus = 'checking' | 'not_authenticated' | 'authenticated' | 'sending' | 'success' | 'error';

export default function ExtensionAuth() {
  const [searchParams] = useSearchParams();
  const extensionId = searchParams.get('ext');
  
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    checkAuthAndSendToken();
  }, []);

  const checkAuthAndSendToken = async () => {
    setStatus('checking');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      setStatus('authenticated');
      await sendTokenToExtension(session.access_token, session.expires_at);
    } else {
      setStatus('not_authenticated');
    }
  };

  const sendTokenToExtension = async (token: string, expiresAt?: number) => {
    if (!extensionId) {
      setStatus('error');
      setErrorMessage('No extension ID provided. Please open this page from the Azyah extension.');
      return;
    }

    setStatus('sending');

    try {
      // Check if chrome.runtime is available (we're in a browser with Chrome APIs)
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response = await new Promise<{ success: boolean; error?: string }>((resolve) => {
          chrome.runtime.sendMessage(
            extensionId,
            {
              type: 'SET_AUTH_TOKEN',
              token,
              expiry: expiresAt ? expiresAt * 1000 : Date.now() + 3600000
            },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(response || { success: false, error: 'No response from extension' });
              }
            }
          );
        });

        if (response.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(response.error || 'Failed to send token to extension');
        }
      } else {
        setStatus('error');
        setErrorMessage('Chrome extension APIs not available. Make sure you\'re using Chrome and the extension is installed.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoggingIn(false);
        return;
      }

      if (data.session?.access_token) {
        setStatus('authenticated');
        await sendTokenToExtension(data.session.access_token, data.session.expires_at);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Render based on status
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'sending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Connecting to extension...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Successfully Connected!</h2>
            <p className="text-muted-foreground text-center mb-6">
              Your Azyah extension is now authenticated. You can close this tab and return to shopping.
            </p>
            <Button onClick={() => window.close()} variant="outline">
              Close This Tab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
            <p className="text-muted-foreground text-center mb-4">{errorMessage}</p>
            <div className="space-y-2">
              <Button onClick={checkAuthAndSendToken} className="w-full">
                Try Again
              </Button>
              {!extensionId && (
                <p className="text-sm text-muted-foreground text-center">
                  Tip: Open this page by clicking "Sign In" from the Azyah extension
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - show login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Chrome className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Sign in to Azyah</CardTitle>
          <CardDescription>
            Connect your account to the Azyah browser extension
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          {!extensionId && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> For the best experience, open this page by clicking "Sign In to Azyah" from the extension's side panel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
