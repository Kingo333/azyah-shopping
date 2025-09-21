import { useState, useEffect } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Sparkles, Heart, Star, ShoppingBag, Store, Building2, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { checkPasswordStrength } from '@/lib/password-validation';
import { generateSecurePassword } from '@/lib/password-generator';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { toast } from '@/hooks/use-toast';
const Auth = () => {
  const {
    user,
    signUp,
    signIn,
    loading
  } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [signinForm, setSigninForm] = useState({
    email: '',
    password: ''
  });
  useEffect(() => {
    // Pre-select role from URL params and switch to signup
    const roleParam = searchParams.get('role');
    if (roleParam && ['brand', 'retailer'].includes(roleParam)) {
      setSelectedRole(roleParam);
      setActiveTab('signup');
    }

    // Check if this is a password reset flow
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setIsResettingPassword(true);
      setActiveTab('signin'); // Keep on signin tab for consistency
    }
  }, [searchParams]);

  // Redirect if already authenticated
  if (user && !loading) {
    const userRole = (user.user_metadata?.role || 'shopper') as UserRole;
    const redirectPath = getRedirectRoute(userRole);
    return <Navigate to={redirectPath} replace />;
  }
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const {
        error
      } = await signIn(signinForm.email, signinForm.password);
      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: "Login Failed",
          description: error.message || "Failed to sign in. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Sign in exception:', err);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const name = formData.get('name') as string;
      if (!selectedRole) {
        toast({
          title: "Role Required",
          description: "Please select your role to continue.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      const result = await signUp(email, password, {
        name,
        role: selectedRole
      });
      if (result?.isExistingUser) {
        // Switch to sign-in tab and pre-fill email
        setActiveTab('signin');
        setSigninForm(prev => ({
          ...prev,
          email: result.email || ''
        }));
        toast({
          title: "Account Already Exists",
          description: "This email is already registered. We've switched you to sign in.",
          variant: "destructive",
          action: <Button variant="outline" size="sm" onClick={() => setActiveTab('signin')}>
              Sign In
            </Button>
        });
        return;
      }
      if (result?.error) {
        console.error('Sign up error:', result.error);
        toast({
          title: "Registration Failed",
          description: result.error.message || "Failed to create account. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Sign up exception:', err);
      toast({
        title: "Registration Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignupFormChange = (field: string, value: string) => {
    setSignupForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const generatePassword = () => {
    const newPassword = generateSecurePassword({
      length: 16,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeSimilar: true
    });
    setSignupForm(prev => ({
      ...prev,
      password: newPassword
    }));
    toast({
      title: "Password Generated",
      description: "A secure password has been generated for you. You can modify it if needed."
    });
  };
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Use our custom edge function for better email delivery
      const {
        data,
        error
      } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: resetEmail,
          redirectTo: `${window.location.origin}/auth?type=recovery`
        }
      });
      if (error) {
        throw new Error(error.message || 'Failed to send reset email');
      }
      toast({
        title: "Reset Email Sent",
        description: "Please check your email for password reset instructions."
      });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };
  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        throw error;
      }
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now sign in."
      });

      // Clear the reset state and redirect to signin
      setIsResettingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/auth', {
        replace: true
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to update password. The link may have expired.",
        variant: "destructive"
      });

      // If token expired, redirect to normal auth
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        setIsResettingPassword(false);
        navigate('/auth', {
          replace: true
        });
      }
    }
    setIsLoading(false);
  };
  const passwordStrength = checkPasswordStrength(signupForm.email, signupForm.password);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen dashboard-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Back to Landing Button */}
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="hover:bg-primary/10 premium-hover">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-30 animate-pulse"></div>
              
            </div>
          </div>
          <div>
            <h1 className="text-6xl font-cormorant font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Azyah
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">Discover fashion that is made for you</p>
          </div>
        </div>

        {/* Auth Card */}
        <GlassPanel variant="premium" className="p-8">
          {isResettingPassword ?
        // Password Reset Form
        <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-cormorant font-semibold">Reset Your Password</h2>
                <p className="text-muted-foreground">Enter your new password to complete the reset</p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                  <div className="relative">
                    <Input id="new-password" type={showPassword ? "text" : "password"} placeholder="Enter your new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="h-12 glass-panel border-white/20 pr-10" />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                  <Input id="confirm-password" type={showPassword ? "text" : "password"} placeholder="Confirm your new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-12 glass-panel border-white/20" />
                </div>

                <Button type="submit" variant="premium" size="lg" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </> : 'Update Password'}
                </Button>

                <div className="text-center">
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                setIsResettingPassword(false);
                navigate('/auth', {
                  replace: true
                });
              }} className="text-sm text-muted-foreground hover:text-primary">
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </div> :
        // Normal Auth Flow
        <>
              <div className="space-y-2 text-center mb-8">
                <h2 className="text-2xl font-cormorant font-semibold">
                  {activeTab === 'signin' ? 'Welcome back' : 'Join Azyah'}
                </h2>
                <p className="text-muted-foreground">
                  {activeTab === 'signin' ? 'Sign in to continue your fashion journey' : 'Create your account to start discovering'}
                </p>
              </div>
              <div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 glass-panel mb-8">
                    <TabsTrigger value="signin" className="flex items-center gap-2">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="flex items-center gap-2">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  {/* Sign In Tab */}
                  <TabsContent value="signin" className="space-y-6 mt-6">
                    <form onSubmit={handleSignIn} className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                        <Input id="signin-email" type="email" placeholder="Enter your email" required className="h-12 glass-panel border-white/20" value={signinForm.email} onChange={e => setSigninForm(prev => ({
                      ...prev,
                      email: e.target.value
                    }))} />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                        <Input id="signin-password" type="password" placeholder="Enter your password" required className="h-12 glass-panel border-white/20" value={signinForm.password} onChange={e => setSigninForm(prev => ({
                      ...prev,
                      password: e.target.value
                    }))} />
                      </div>
                      <Button type="submit" variant="premium" size="lg" className="w-full h-12" disabled={isLoading}>
                        {isLoading ? <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing In...
                          </> : 'Sign In'}
                      </Button>
                      
                      <div className="text-center">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForgotPassword(true)} className="text-sm text-muted-foreground hover:text-primary">
                          Forgot your password?
                        </Button>
                      </div>
                    </form>

                    {/* Forgot Password Modal */}
                    {showForgotPassword && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-background rounded-lg p-6 w-full max-w-md glass-panel border">
                          <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                              <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                              <Input id="reset-email" type="email" placeholder="Enter your email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required className="h-12 glass-panel border-white/20" />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" className="flex-1" disabled={isLoading}>
                                {isLoading ? <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </> : 'Send Reset Email'}
                              </Button>
                              <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} disabled={isLoading}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </div>
                      </div>}
                  </TabsContent>

                  {/* Sign Up Tab */}
                  <TabsContent value="signup" className="space-y-6 mt-4">

                    {/* Role Selection - Compact */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <Label className="text-base font-cormorant font-bold text-foreground">Choose Your Role</Label>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {/* Shopper Role */}
                        <GlassPanel variant={selectedRole === "shopper" ? "premium" : "default"} className={`p-3 cursor-pointer transition-all duration-200 ${selectedRole === "shopper" ? "border-primary/60 shadow-md scale-[1.02]" : "hover:scale-[1.01] hover:border-primary/40"}`} onClick={() => setSelectedRole(selectedRole === "shopper" ? "" : "shopper")}>
                          <div className="text-center space-y-2">
                            <div className={`p-2 rounded-lg mx-auto w-fit ${selectedRole === "shopper" ? "bg-gradient-to-br from-primary/30 to-primary/20" : "bg-muted/50"}`}>
                              <ShoppingBag className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-xs">Fashion Lover</h3>
                              <p className="text-xs text-muted-foreground">Shop & discover</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 mx-auto ${selectedRole === "shopper" ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                              {selectedRole === "shopper" && <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>}
                            </div>
                          </div>
                        </GlassPanel>

                        {/* Brand Role */}
                        <GlassPanel variant={selectedRole === "brand" ? "premium" : "default"} className={`p-3 cursor-pointer transition-all duration-200 ${selectedRole === "brand" ? "border-primary/60 shadow-md scale-[1.02]" : "hover:scale-[1.01] hover:border-primary/40"}`} onClick={() => setSelectedRole(selectedRole === "brand" ? "" : "brand")}>
                          <div className="text-center space-y-2">
                            <div className={`p-2 rounded-lg mx-auto w-fit ${selectedRole === "brand" ? "bg-gradient-to-br from-primary/30 to-primary/20" : "bg-muted/50"}`}>
                              <Star className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-xs">Brand Owner</h3>
                              <p className="text-xs text-muted-foreground">Sell products</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 mx-auto ${selectedRole === "brand" ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                              {selectedRole === "brand" && <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>}
                            </div>
                          </div>
                        </GlassPanel>

                        {/* Retailer Role - Disabled */}
                        <GlassPanel variant="default" className="p-3 opacity-50 cursor-not-allowed transition-all duration-200">
                          <div className="text-center space-y-2">
                            <div className="p-2 rounded-lg mx-auto w-fit bg-muted/50">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-xs text-muted-foreground">Retailer</h3>
                              <p className="text-xs text-muted-foreground">Coming Soon</p>
                            </div>
                            <div className="w-4 h-4 rounded-full border-2 mx-auto border-muted-foreground">
                            </div>
                          </div>
                        </GlassPanel>
                      </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="signup-name" className="text-xs font-medium">Full Name</Label>
                          <Input id="signup-name" name="name" type="text" placeholder="Your name" required value={signupForm.name} onChange={e => handleSignupFormChange("name", e.target.value)} className="h-10 glass-panel border-white/20 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="signup-email" className="text-xs font-medium">Email</Label>
                          <Input id="signup-email" name="email" type="email" placeholder="Your email" required value={signupForm.email} onChange={e => handleSignupFormChange("email", e.target.value)} className="h-10 glass-panel border-white/20 text-sm" />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signup-password" className="text-xs font-medium">Password</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={generatePassword} className="h-6 px-2 text-xs text-primary hover:bg-primary/10">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Generate
                          </Button>
                        </div>
                        <div className="relative">
                          <Input id="signup-password" name="password" type={showPassword ? "text" : "password"} placeholder="Create password (6+ characters)" required minLength={6} value={signupForm.password} onChange={e => handleSignupFormChange("password", e.target.value)} className="h-10 glass-panel border-white/20 text-sm pr-10" />
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent">
                            {showPassword ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                          </Button>
                        </div>
                        <PasswordStrengthIndicator strength={passwordStrength} password={signupForm.password} />
                      </div>
                      
                      <Button type="submit" variant="premium" size="lg" className="w-full h-12 text-sm font-semibold" disabled={isLoading || !selectedRole || !passwordStrength.isValid}>
                        {isLoading ? <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </> : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            </>}
        </GlassPanel>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to our{" "}
            <span className="underline font-medium hover:text-primary cursor-pointer" onClick={() => navigate('/terms')}>
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="underline font-medium hover:text-primary cursor-pointer" onClick={() => navigate('/privacy')}>
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>;
};
export default Auth;