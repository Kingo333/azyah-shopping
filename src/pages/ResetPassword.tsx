import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Lock, AlertCircle } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionValid, setSessionValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Check if we have a valid recovery session
        // Supabase sets up the session automatically when user clicks the recovery link
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          setErrorMessage('Unable to verify your session. Please request a new password reset link.');
          setSessionValid(false);
          return;
        }

        if (!session) {
          // No session - check if we have tokens in hash (user just clicked recovery link)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && refreshToken && type === 'recovery') {
            // Set the session from the recovery tokens
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (setSessionError) {
              console.error('Failed to set session:', setSessionError);
              setErrorMessage('Your reset link has expired. Please request a new one.');
              setSessionValid(false);
              return;
            }

            setSessionValid(true);
          } else {
            setErrorMessage('Invalid or expired password reset link. Please request a new one.');
            setSessionValid(false);
          }
          return;
        }

        // We have a valid session - user can reset password
        setSessionValid(true);
      } catch (error) {
        console.error('Verification error:', error);
        setErrorMessage('Something went wrong. Please try again.');
        setSessionValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifySession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(error.message || 'Failed to reset password');
      } else {
        toast.success('Password reset successfully!');
        
        // Get user role to redirect to correct dashboard
        const { data: { user } } = await supabase.auth.getUser();
        const userRole = user?.user_metadata?.role || 'shopper';
        
        if (userRole === 'brand') {
          navigate('/brand-portal', { replace: true });
        } else if (userRole === 'retailer') {
          navigate('/retailer-portal', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while verifying session
  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  // Show error state if session is invalid
  if (!sessionValid) {
    return (
      <>
        <SEOHead
          title="Reset Password | Azyah"
          description="Reset your Azyah account password"
        />
        
        <div className="min-h-screen bg-background flex flex-col">
          <div className="p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/onboarding/signup')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center px-6">
            <div className="w-full max-w-md text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Link Expired
              </h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <Button
                onClick={() => navigate('/reset-password-request')}
                className="w-full h-14 text-lg font-semibold rounded-full bg-black hover:bg-black/90 text-white"
              >
                Request New Link
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Reset Password | Azyah"
        description="Reset your Azyah account password"
      />
      
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/onboarding/signup')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Reset Your Password
              </h1>
              <p className="text-muted-foreground">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  New Password
                </Label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                  minLength={6}
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Confirm Password
                </Label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 text-lg font-semibold rounded-full bg-black hover:bg-black/90 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
