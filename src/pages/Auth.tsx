import { useState, useEffect } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Sparkles, Heart, Star, ShoppingBag, Store, Building2, ArrowLeft } from 'lucide-react';

const Auth = () => {
  const { user, signUp, signIn, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [selectedRole, setSelectedRole] = useState<string>('');

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
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    if (!error) {
      navigate('/dashboard');
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
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

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
                <Sparkles className="h-8 w-8 text-primary mx-auto" />
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
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-6 mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      required
                      className="h-12 glass-panel border-white/20"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      className="h-12 glass-panel border-white/20"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a strong password"
                      required
                      minLength={6}
                      className="h-12 glass-panel border-white/20"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-base font-cormorant font-semibold">Choose your role</Label>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Shopper Role */}
                      <GlassPanel
                        variant={selectedRole === 'shopper' ? 'premium' : 'default'}
                        className={`p-5 cursor-pointer transition-all duration-300 ${
                          selectedRole === 'shopper'
                            ? 'border-primary/50 shadow-lg scale-[1.02]'
                            : 'hover:scale-[1.01] hover:border-primary/30'
                        }`}
                        onClick={() => setSelectedRole('shopper')}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-xl ${
                            selectedRole === 'shopper' 
                              ? 'bg-gradient-to-br from-primary/20 to-primary/10' 
                              : 'bg-muted/50'
                          }`}>
                            <ShoppingBag className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">Fashion Lover</h3>
                            <p className="text-sm text-muted-foreground">Shop and discover new styles</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            selectedRole === 'shopper' 
                              ? 'border-primary bg-primary' 
                              : 'border-muted-foreground'
                          }`}>
                            {selectedRole === 'shopper' && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </GlassPanel>

                      {/* Brand Role */}
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedRole === 'brand'
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:bg-primary/2'
                        }`}
                        onClick={() => setSelectedRole('brand')}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            selectedRole === 'brand' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <Star className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">Brand Owner</h3>
                            <p className="text-xs text-muted-foreground">Sell your own products</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedRole === 'brand' 
                              ? 'border-primary bg-primary' 
                              : 'border-muted-foreground'
                          }`}>
                            {selectedRole === 'brand' && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Retailer Role */}
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedRole === 'retailer'
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:bg-primary/2'
                        }`}
                        onClick={() => setSelectedRole('retailer')}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            selectedRole === 'retailer' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">Retailer</h3>
                            <p className="text-xs text-muted-foreground">Sell multiple brands</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedRole === 'retailer' 
                              ? 'border-primary bg-primary' 
                              : 'border-muted-foreground'
                          }`}>
                            {selectedRole === 'retailer' && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    variant="premium"
                    size="lg"
                    className="w-full h-12"
                    disabled={isLoading || !selectedRole}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
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