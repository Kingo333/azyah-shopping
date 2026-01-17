import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * AuthCallback handles all Supabase auth redirects:
 * - Email confirmation (type=signup)
 * - Password recovery (type=recovery)
 * - Magic link login (type=magiclink)
 * 
 * Note: OAuth (Google, Apple) has been removed - email/password only for all roles.
 * 
 * Supabase returns tokens in the URL hash fragment (#), not query params (?).
 * Format: #access_token=xxx&refresh_token=xxx&type=signup|recovery|magiclink
 */

type UserRole = 'shopper' | 'brand' | 'retailer' | 'admin';

/**
 * Fetch user role with retry logic.
 * Role might not be immediately available if DB trigger is delayed.
 */
async function fetchUserRoleWithRetry(userId: string, maxRetries = 5, delayMs = 1000): Promise<UserRole> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`AuthCallback: Fetching role (attempt ${attempt + 1}/${maxRetries})`);
    
    // Try user_roles table first (source of truth)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!roleError && roleData?.role) {
      console.log('AuthCallback: Role found in user_roles:', roleData.role);
      return roleData.role as UserRole;
    }
    
    // Fallback: check users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (!userError && userData?.role) {
      console.log('AuthCallback: Role found in users table:', userData.role);
      return userData.role as UserRole;
    }
    
    // Wait before next attempt (except on last attempt)
    if (attempt < maxRetries - 1) {
      console.log(`AuthCallback: Role not found, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Final fallback: check user metadata
  const { data: { user } } = await supabase.auth.getUser();
  const metaRole = user?.user_metadata?.role;
  if (metaRole) {
    console.log('AuthCallback: Using role from user metadata:', metaRole);
    return metaRole as UserRole;
  }
  
  console.log('AuthCallback: No role found after retries, defaulting to shopper');
  return 'shopper';
}

/**
 * Navigate to the correct destination based on user role
 * Shoppers go to Feed (/swipe) as the default landing
 */
function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'brand':
      return '/brand-portal';
    case 'retailer':
      return '/retailer-portal';
    case 'admin':
      return '/dashboard';
    case 'shopper':
    default:
      return '/swipe'; // Feed-first for shoppers
  }
}

/**
 * Check if user needs calibration (new user without preferences)
 */
async function needsCalibration(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferences_completed')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data) return true; // Default to showing calibration
    return !data.preferences_completed;
  } catch {
    return false; // Don't block on errors
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'retry_failed'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

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
          // Show success state briefly before redirect
          setStatus('success');
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else if (type === 'magiclink') {
          toast.success('Successfully signed in!');
        }

        // Fetch role with retry logic (handles DB trigger delay)
        const userRole = await fetchUserRoleWithRetry(user.id);
        
        // For shoppers, check if they need calibration first
        if (userRole === 'shopper') {
          const needsCal = await needsCalibration(user.id);
          if (needsCal) {
            console.log('AuthCallback: New shopper needs calibration');
            navigate('/onboarding-calibration', { replace: true });
            return;
          }
        }
        
        const dashboardPath = getDashboardPath(userRole);
        console.log('AuthCallback: Routing to', dashboardPath, 'for role', userRole);
        navigate(dashboardPath, { replace: true });
        return;
      }

      // No tokens in hash - check if we already have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (session?.user) {
        // Fetch role with retry logic
        const userRole = await fetchUserRoleWithRetry(session.user.id);
        
        // For shoppers, check if they need calibration first
        if (userRole === 'shopper') {
          const needsCal = await needsCalibration(session.user.id);
          if (needsCal) {
            console.log('AuthCallback: Existing shopper needs calibration');
            navigate('/onboarding-calibration', { replace: true });
            return;
          }
        }
        
        const dashboardPath = getDashboardPath(userRole);
        console.log('AuthCallback: Existing session, routing to', dashboardPath);
        navigate(dashboardPath, { replace: true });
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

  const handleRetry = () => {
    setStatus('processing');
    setErrorMessage('');
    handleCallback();
  };

  useEffect(() => {
    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 px-6">
        {status === 'processing' ? (
          <>
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">Verifying your account...</p>
              <p className="text-muted-foreground text-sm">Please wait while we set things up</p>
            </div>
          </>
        ) : status === 'success' ? (
          <>
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">Email verified ✅</p>
              <p className="text-muted-foreground text-sm">Redirecting to your dashboard...</p>
            </div>
          </>
        ) : status === 'retry_failed' ? (
          <>
            <p className="text-destructive font-medium">{errorMessage}</p>
            <p className="text-muted-foreground text-sm mb-4">
              Your account was created but we couldn't load your profile.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => navigate('/onboarding/signup', { replace: true })} 
                variant="outline"
              >
                Back to Login
              </Button>
            </div>
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
