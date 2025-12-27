import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Capacitor } from '@capacitor/core';
export default function ResetPasswordRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // Use auth/callback for proper token handling
      // For native apps, Supabase deep links will open the app
      const redirectUrl = Capacitor.isNativePlatform()
        ? 'com.azyah.style://auth/callback'
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error(error.message || 'Failed to send reset email');
      } else {
        setEmailSent(true);
        toast.success('Password reset link sent! Check your email.');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Forgot Password | Azyah"
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
            {!emailSent ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Forgot Password?
                  </h1>
                  <p className="text-muted-foreground">
                    Enter your email and we'll send you a link to reset your password
                  </p>
                </div>

                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl"
                      required
                      autoFocus
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
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => navigate('/onboarding/signup')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to login
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Check Your Email
                </h1>
                <p className="text-muted-foreground mb-8">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <Button
                  onClick={() => navigate('/onboarding/signup')}
                  variant="outline"
                  className="w-full h-12 rounded-xl"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
