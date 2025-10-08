import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type FlowStep = 'initial' | 'email-entry';
type UserRole = 'shopper' | 'brand' | 'retailer';

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<FlowStep>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('shopper');
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  // Handle role-based signup from URL params
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && (roleParam === 'brand' || roleParam === 'retailer')) {
      setUserRole(roleParam);
      setStep('email-entry'); // Skip initial screen for brand/retailer
    }
  }, [searchParams]);

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingEmail(true);

    try {
      // Try to sign in with dummy password to check if email exists
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password: '___dummy_check___',
      });

      // Check the error message to determine if user exists
      const userExists = checkError?.message?.includes('Invalid login credentials') || 
                        checkError?.message?.includes('Email not confirmed');
      
      setEmailExists(userExists);
      setShowPassword(true);
    } catch (error) {
      // If there's an error checking, assume new user
      setEmailExists(false);
      setShowPassword(true);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (emailExists) {
        // Existing user - sign in
        const { error: signInError } = await signIn(email, password);
        
        if (signInError) {
          toast.error('Incorrect password. Please try again.');
        } else {
          toast.success('Welcome back!');
          // Redirect based on role
          if (userRole === 'brand') {
            navigate('/brand-portal');
          } else if (userRole === 'retailer') {
            navigate('/retailer-portal');
          } else {
            navigate('/swipe');
          }
        }
      } else {
        // New user - sign up
        const { error: signUpError } = await signUp(email, password, { role: userRole });
        
        if (signUpError) {
          toast.error(signUpError.message || 'Failed to create account');
        } else {
          toast.success('Account created successfully!');
          // Redirect based on role
          if (userRole === 'brand') {
            navigate('/brand-portal');
          } else if (userRole === 'retailer') {
            navigate('/retailer-portal');
          } else {
            navigate('/onboarding/gender-select');
          }
        }
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    try {
      const redirectUrl = userRole === 'shopper' 
        ? `${window.location.origin}/swipe`
        : userRole === 'brand'
        ? `${window.location.origin}/brand-portal`
        : `${window.location.origin}/retailer-portal`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        toast.error(`Failed to sign in with ${provider === 'google' ? 'Google' : 'Apple'}`);
      }
    } catch (error) {
      toast.error('OAuth sign-in failed');
    }
  };

  const handleBack = () => {
    if (showPassword) {
      setShowPassword(false);
      setPassword('');
      setEmailExists(null);
    } else if (step === 'email-entry') {
      setStep('initial');
      setEmail('');
    } else {
      navigate('/');
    }
  };

  // Email entry screen
  if (step === 'email-entry') {
    const isBrandOrRetailer = userRole === 'brand' || userRole === 'retailer';
    const roleTitle = userRole === 'brand' ? 'Brand' : userRole === 'retailer' ? 'Retailer' : '';

    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold mb-2 text-foreground text-center">
              {isBrandOrRetailer 
                ? `Create your ${roleTitle} account`
                : showPassword 
                  ? (emailExists ? 'Welcome back! 👋' : "Let's create your account") 
                  : 'Hi there 👋'
              }
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              {isBrandOrRetailer
                ? 'Get started with your business account'
                : showPassword 
                  ? (emailExists ? 'Enter your password to continue' : "You don't have an account yet")
                  : 'Log in or sign up in seconds.'
              }
            </p>

            <form onSubmit={showPassword ? handlePasswordSubmit : handleEmailContinue} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                  autoFocus={!showPassword}
                  disabled={showPassword}
                />
              </div>

              {showPassword && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl"
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || checkingEmail}
                className="w-full h-14 text-lg font-semibold rounded-full bg-black hover:bg-black/90 text-white"
              >
                {loading || checkingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {checkingEmail ? 'Checking...' : 'Processing...'}
                  </>
                ) : showPassword ? (
                  emailExists ? 'Log in' : 'Create account'
                ) : (
                  'Continue'
                )}
              </Button>
            </form>

            {!isBrandOrRetailer && (
              <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
                <p>
                  Are you a brand?{' '}
                  <button
                    onClick={() => navigate('/onboarding/signup?role=brand')}
                    className="text-primary hover:underline font-medium"
                  >
                    Create a brand account
                  </button>
                </p>
                <p className="flex items-center justify-center gap-1">
                  <span>•</span>
                </p>
                <p>
                  Are you a retailer?{' '}
                  <button
                    onClick={() => navigate('/onboarding/signup?role=retailer')}
                    className="text-primary hover:underline font-medium"
                  >
                    Create a retailer account
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Initial OAuth screen (only for shoppers)
  const isBrandOrRetailer = userRole === 'brand' || userRole === 'retailer';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ 
          backgroundImage: 'url(/onboarding/signup.png)',
          filter: 'brightness(0.4)'
        }}
      />
      
      {/* Back Button */}
      <div className="p-4 relative z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Azyah Branding */}
      <div className="pt-4 pb-8 relative z-10">
        <h1 className="text-4xl font-bold text-white text-center tracking-tight">
          Azyah
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 relative z-10 overflow-auto pb-6">
        <div className="w-full max-w-md text-center">
          <p className="text-white text-lg mb-8 font-medium px-4">
            Create your free account to backup outfits and sync across devices.
          </p>

          <div className="space-y-4">
            {!isBrandOrRetailer && (
              <>
                <Button
                  onClick={() => handleOAuthSignIn('google')}
                  className="w-full h-14 text-base font-medium rounded-full border-2"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  onClick={() => handleOAuthSignIn('apple')}
                  className="w-full h-14 text-base font-medium rounded-full border-2"
                >
                  <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </>
            )}

            {!isBrandOrRetailer && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/80">or</span>
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep('email-entry')}
              className="w-full h-14 text-base font-semibold rounded-full bg-white hover:bg-gray-100 text-black"
            >
              <Mail className="w-5 h-5 mr-2" />
              Continue with email
            </Button>
          </div>

          {!isBrandOrRetailer && (
            <div className="mt-6 text-center text-sm text-white/80 space-y-2">
              <p>
                Are you a brand?{' '}
                <button
                  onClick={() => navigate('/onboarding/signup?role=brand')}
                  className="text-white hover:underline font-medium"
                >
                  Create a brand account
                </button>
              </p>
              <p className="flex items-center justify-center gap-1">
                <span>•</span>
              </p>
              <p>
                Are you a retailer?{' '}
                <button
                  onClick={() => navigate('/onboarding/signup?role=retailer')}
                  className="text-white hover:underline font-medium"
                >
                  Create a retailer account
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
