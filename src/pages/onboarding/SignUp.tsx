import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Apple, Mail } from 'lucide-react';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signUp(email, password, { role: 'shopper' });
      
      if (error) {
        toast.error(error.message || 'Failed to create account');
      } else {
        toast.success('Account created! Please check your email to verify.');
        navigate('/onboarding/gender-select');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    // TODO: Implement Google OAuth
    toast.info('Google sign-up coming soon');
  };

  const handleAppleSignUp = async () => {
    // TODO: Implement Apple OAuth
    toast.info('Apple sign-up coming soon');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2 text-foreground">
            Create your free account
          </h1>
          <p className="text-muted-foreground text-sm">
            to sync and personalize your style experience.
          </p>
        </div>

        {/* Top Links */}
        <div className="flex justify-center gap-4 mb-6 text-xs">
          <button
            onClick={() => navigate('/onboarding/brand-signup')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Are you a brand? <span className="font-semibold">Create a brand account</span>
          </button>
        </div>
        <div className="flex justify-center mb-8 text-xs">
          <button
            onClick={() => navigate('/onboarding/retailer-signup')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Are you a retailer? <span className="font-semibold">Create a retailer account</span>
          </button>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={handleAppleSignUp}
            variant="outline"
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            <Apple className="mr-2 h-5 w-5" />
            Continue with Apple
          </Button>

          <Button
            onClick={handleGoogleSignUp}
            variant="outline"
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        {/* Email Sign Up Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4 mb-6">
          <div>
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            <Mail className="mr-2 h-5 w-5" />
            {loading ? 'Creating account...' : 'Continue with Email'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center">
          <button
            onClick={() => navigate('/auth')}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Already have an account? <span className="font-semibold">Log in</span>
          </button>
        </div>
      </div>
    </div>
  );
}
