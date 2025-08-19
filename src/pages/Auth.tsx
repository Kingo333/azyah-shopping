
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
import { Loader2, Sparkles, Heart, Star, ShoppingBag, Store, Building2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { checkPasswordStrength } from '@/lib/password-validation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

const Auth = () => {
  const { user, signUp, signIn, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  useEffect(() => {
    // Pre-select role from URL params and switch to signup
    const roleParam = searchParams.get('role');
    if (roleParam && ['brand', 'retailer'].includes(roleParam)) {
      setSelectedRole(roleParam);
      setActiveTab('signup');
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
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    if (!error) {
      // Let the auth state change handler redirect to appropriate dashboard
      // The user role will be available in the session after sign in
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    if (!selectedRole) {
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, { name, role: selectedRole });
    if (!error) {
      // Let the auth state change handler redirect to appropriate dashboard
      // The user role is set in metadata during signup
    }
    setIsLoading(false);
  };

  const handleSignupFormChange = (field: string, value: string) => {
    setSignupForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGoogleSignIn = async () => {
    // For sign up tab, require role selection
    if (activeTab === 'signup' && !selectedRole) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Role-first sign-in with correct redirectTo format
      const role = selectedRole || 'shopper';
      const redirectTo = `${window.location.origin}/auth/callback?role=${role}`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { 
            prompt: 'consent', 
            access_type: 'offline' 
          }
        }
      });
      
      if (error) throw error;
      
      // Store role for callback
      if (selectedRole) {
        localStorage.setItem('signup_role', selectedRole);
      }
      const intent = activeTab === 'signin' ? 'signin' : 'signup';
      localStorage.setItem('auth_intent', intent);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setIsLoading(false);
    }
  };

  const passwordStrength = checkPasswordStrength(signupForm.email, signupForm.password);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Back to Landing Button */}
        <div className="flex justify-start">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="hover:bg-primary/10 premium-hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative glass-premium rounded-full p-6 shadow-lg">
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-cormorant font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Azyah
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Discover fashion that speaks to your soul
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <GlassPanel variant="premium" className="p-8">
          <div className="space-y-2 text-center mb-8">
            <h2 className="text-2xl font-cormorant font-semibold">
              {activeTab === 'signin' ? 'Welcome back' : 'Join Azyah'}
            </h2>
            <p className="text-muted-foreground">
              {activeTab === 'signin' 
                ? 'Sign in to continue your fashion journey' 
                : 'Create your account to start discovering'
              }
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
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      className="h-12 glass-panel border-white/20"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      className="h-12 glass-panel border-white/20"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    variant="premium"
                    size="lg"
                    className="w-full h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full h-12"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {isLoading ? 'Connecting...' : 'Continue with Google'}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-6 mt-4">
                {/* Google Sign Up - Prominent at Top */}
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-base font-cormorant font-semibold text-foreground">
                      Quick Sign Up
                    </p>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="premium"
                    size="lg"
                    className="w-full h-12 text-sm font-semibold"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || !selectedRole}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {isLoading ? "Connecting..." : selectedRole ? `Continue with Google as ${selectedRole}` : "Continue with Google"}
                  </Button>
                  
                  {!selectedRole && (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-1.5 rounded text-center">
                      Select your role first
                    </p>
                  )}
                </div>

                {/* Role Selection - Compact */}
                <div className="space-y-3">
                  <div className="text-center">
                    <Label className="text-base font-cormorant font-bold text-foreground">Choose Your Role</Label>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {/* Shopper Role */}
                    <GlassPanel
                      variant={selectedRole === "shopper" ? "premium" : "default"}
                      className={`p-3 cursor-pointer transition-all duration-200 ${
                        selectedRole === "shopper"
                          ? "border-primary/60 shadow-md scale-[1.02]"
                          : "hover:scale-[1.01] hover:border-primary/40"
                      }`}
                      onClick={() => setSelectedRole("shopper")}
                    >
                      <div className="text-center space-y-2">
                        <div className={`p-2 rounded-lg mx-auto w-fit ${
                          selectedRole === "shopper" 
                            ? "bg-gradient-to-br from-primary/30 to-primary/20" 
                            : "bg-muted/50"
                        }`}>
                          <ShoppingBag className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-xs">Fashion Lover</h3>
                          <p className="text-xs text-muted-foreground">Shop & discover</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                          selectedRole === "shopper" 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedRole === "shopper" && (
                            <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>
                          )}
                        </div>
                      </div>
                    </GlassPanel>

                    {/* Brand Role */}
                    <GlassPanel
                      variant={selectedRole === "brand" ? "premium" : "default"}
                      className={`p-3 cursor-pointer transition-all duration-200 ${
                        selectedRole === "brand"
                          ? "border-primary/60 shadow-md scale-[1.02]"
                          : "hover:scale-[1.01] hover:border-primary/40"
                      }`}
                      onClick={() => setSelectedRole("brand")}
                    >
                      <div className="text-center space-y-2">
                        <div className={`p-2 rounded-lg mx-auto w-fit ${
                          selectedRole === "brand" 
                            ? "bg-gradient-to-br from-primary/30 to-primary/20" 
                            : "bg-muted/50"
                        }`}>
                          <Star className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-xs">Brand Owner</h3>
                          <p className="text-xs text-muted-foreground">Sell products</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                          selectedRole === "brand" 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedRole === "brand" && (
                            <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>
                          )}
                        </div>
                      </div>
                    </GlassPanel>

                    {/* Retailer Role */}
                    <GlassPanel
                      variant={selectedRole === "retailer" ? "premium" : "default"}
                      className={`p-3 cursor-pointer transition-all duration-200 ${
                        selectedRole === "retailer"
                          ? "border-primary/60 shadow-md scale-[1.02]"
                          : "hover:scale-[1.01] hover:border-primary/40"
                      }`}
                      onClick={() => setSelectedRole("retailer")}
                    >
                      <div className="text-center space-y-2">
                        <div className={`p-2 rounded-lg mx-auto w-fit ${
                          selectedRole === "retailer" 
                            ? "bg-gradient-to-br from-primary/30 to-primary/20" 
                            : "bg-muted/50"
                        }`}>
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-xs">Retailer</h3>
                          <p className="text-xs text-muted-foreground">Multi-brand</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                          selectedRole === "retailer" 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedRole === "retailer" && (
                            <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>
                          )}
                        </div>
                      </div>
                    </GlassPanel>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">Or use email</span>
                  </div>
                </div>

                {/* Email Form - Compact */}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="signup-name" className="text-xs font-medium">Full Name</Label>
                      <Input
                        id="signup-name"
                        name="name"
                        type="text"
                        placeholder="Your name"
                        required
                        value={signupForm.name}
                        onChange={(e) => handleSignupFormChange("name", e.target.value)}
                        className="h-10 glass-panel border-white/20 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="signup-email" className="text-xs font-medium">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="Your email"
                        required
                        value={signupForm.email}
                        onChange={(e) => handleSignupFormChange("email", e.target.value)}
                        className="h-10 glass-panel border-white/20 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="signup-password" className="text-xs font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create password (8+ characters)"
                      required
                      minLength={8}
                      value={signupForm.password}
                      onChange={(e) => handleSignupFormChange("password", e.target.value)}
                      className="h-10 glass-panel border-white/20 text-sm"
                    />
                    <PasswordStrengthIndicator 
                      strength={passwordStrength} 
                      password={signupForm.password}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    variant="premium"
                    size="lg"
                    className="w-full h-12 text-sm font-semibold"
                    disabled={isLoading || !selectedRole || !passwordStrength.isValid}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </GlassPanel>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
