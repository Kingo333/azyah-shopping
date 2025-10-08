import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type FlowStep = 'initial' | 'email-entry';

export default function SignUp() {
  const [step, setStep] = useState<FlowStep>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingEmail(true);

    try {
      // Check if email exists by querying auth.users via password reset attempt
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      
      // If no error or specific error, email likely exists
      // Note: Supabase doesn't reveal if email exists for security, but we can infer
      // We'll use a different approach: try to sign in with a dummy password
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password: '___dummy_check___', // This will fail but tells us if user exists
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
          navigate('/swipe');
        }
      } else {
        // New user - sign up
        const { error: signUpError } = await signUp(email, password, { role: 'shopper' });
        
        if (signUpError) {
          toast.error(signUpError.message || 'Failed to create account');
        } else {
          toast.success('Account created successfully!');
          navigate('/onboarding/gender-select');
        }
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: 'google' | 'apple') => async () => {
    toast.info(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in coming soon!`);
    // TODO: Implement OAuth with Supabase
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
              {showPassword ? (emailExists ? 'Welcome back! 👋' : "Let's create your account") : 'Hi there 👋'}
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              {showPassword 
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
          </div>
        </div>
      </div>
    );
  }

  // Initial OAuth screen
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

          <div className="space-y-3 mb-8">
            <Button
              onClick={handleOAuthSignIn('apple')}
              className="w-full h-14 text-base font-semibold rounded-xl bg-white hover:bg-gray-100 text-black"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </Button>

            <Button
              onClick={handleOAuthSignIn('google')}
              className="w-full h-14 text-base font-semibold rounded-xl bg-white hover:bg-gray-100 text-black"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <Button
              onClick={() => setStep('email-entry')}
              className="w-full h-14 text-base font-semibold rounded-xl bg-white hover:bg-gray-100 text-black"
            >
              <Mail className="w-5 h-5 mr-2" />
              Continue with email
            </Button>
          </div>

          <div className="space-y-3 text-center">
            <div className="flex gap-3 justify-center text-xs text-white/80 flex-wrap px-2">
              <button 
                onClick={() => navigate('/select-role?type=brand')}
                className="hover:text-white transition-colors underline"
              >
                Are you a brand? Create a brand account
              </button>
              <span>•</span>
              <button 
                onClick={() => navigate('/select-role?type=retailer')}
                className="hover:text-white transition-colors underline"
              >
                Are you a retailer? Create a retailer account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
