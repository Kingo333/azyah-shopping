import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AuthCallback handles all Supabase auth redirects:
 * - Email confirmation (type=signup)
 * - Password recovery (type=recovery)
 * - Magic link login (type=magiclink)
 * - OAuth callbacks (Google, Apple)
 * 
 * Supabase returns tokens in the URL hash fragment (#), not query params (?).
 * Format: #access_token=xxx&refresh_token=xxx&type=signup|recovery|magiclink
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse hash fragment - Supabase returns tokens here
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const errorParam = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        console.log('AuthCallback: Processing callback', { type, hasAccessToken: !!accessToken, error: errorParam });

        // Handle errors from Supabase
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          const user = data.session?.user;
          
          if (!user) {
            throw new Error('No user in session after setting tokens');
          }

          // Handle different auth types
          if (type === 'recovery') {
            // Password reset flow - redirect to reset password page
            toast.success('Please set your new password');
            navigate('/reset-password', { replace: true });
            return;
          }

          if (type === 'signup') {
            toast.success('Email confirmed! Welcome to Azyah');
          } else if (type === 'magiclink') {
            toast.success('Successfully signed in!');
          }

          // Get user role and redirect accordingly
          const userRole = user.user_metadata?.role || 'shopper';
          
          if (userRole === 'brand') {
            navigate('/brand-portal', { replace: true });
          } else if (userRole === 'retailer') {
            navigate('/retailer-portal', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        // No tokens in hash - check if we already have a session
        // This can happen with OAuth flows where Supabase handles the redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          const userRole = session.user.user_metadata?.role || 'shopper';
          
          if (userRole === 'brand') {
            navigate('/brand-portal', { replace: true });
          } else if (userRole === 'retailer') {
            navigate('/retailer-portal', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        // No session found - redirect to signup
        console.log('AuthCallback: No session found, redirecting to signup');
        navigate('/onboarding/signup', { replace: true });

      } catch (error: any) {
        console.error('AuthCallback error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Authentication failed');
        toast.error(error.message || 'Authentication failed');
        
        // Redirect to signup after showing error
        setTimeout(() => {
          navigate('/onboarding/signup', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'processing' ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Completing authentication...</p>
          </>
        ) : (
          <>
            <p className="text-destructive font-medium">{errorMessage}</p>
            <p className="text-muted-foreground text-sm">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
