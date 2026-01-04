import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CredentialsSchema } from '@/lib/password-validation';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { Capacitor } from '@capacitor/core';
import { 
  performSessionHealthCheck, 
  shouldPerformHealthCheck, 
  clearAllAuthData,
  setNavigationCallback
} from '@/utils/sessionHealthCheck';
import { clearGuestModeStorage } from '@/hooks/useGuestMode';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any; isExistingUser?: boolean; email?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<{ error: any }>;
  // For programmatic navigation after signout
  onSignOutComplete?: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthCheckPerformed, setHealthCheckPerformed] = useState(false);
  const [signOutCallback, setSignOutCallback] = useState<(() => void) | null>(null);

  // Allow App component to set navigation callback for recovery
  useEffect(() => {
    // This will be set by useAuthNavigation hook in App
    return () => {
      setNavigationCallback(() => {});
    };
  }, []);

  useEffect(() => {
    // Perform health check on app startup - but less aggressively
    const initializeAuth = async () => {
      if (shouldPerformHealthCheck() && !healthCheckPerformed) {
        console.log('Performing startup session health check...');
        setHealthCheckPerformed(true);
        
        // Health check now only returns false after multiple consecutive failures
        const isHealthy = await performSessionHealthCheck();
        
        if (!isHealthy) {
          console.log('Session unhealthy after multiple checks - clearing state');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
      }

      // Auth state management - database trigger handles profile creation automatically
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
          console.log('AuthContext: Auth state changed:', { event, user: session?.user?.email });
          
          // Handle OAuth sign-in events - clear guest mode on real auth
          if (event === 'SIGNED_IN' && session) {
            clearGuestModeStorage(); // Clear guest mode when user signs in
            const provider = session.user.app_metadata?.provider;
            const userRole = session.user.user_metadata?.role || 'shopper';
            console.log('Auth sign-in detected:', { provider, role: userRole });
            
            // OAuth has been removed - email/password only for all roles
            // Legacy OAuth users will be prompted to reset their password
            
            // Initialize IAP and identify user in RevenueCat on iOS (fire-and-forget)
            if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
              setTimeout(async () => {
                try {
                  const { initIap, setIapUserId } = await import('@/lib/iap');
                  await initIap();
                  await setIapUserId(session.user.id);
                } catch (error) {
                  console.error('Failed to initialize IAP after sign-in:', error);
                }
              }, 0);
            }
          }
          
          // Handle token refresh failure more gracefully
          if (event === 'TOKEN_REFRESHED' && !session) {
            console.log('Token refresh returned no session - user may have logged out elsewhere');
            // Don't force recovery - just update state
            setSession(null);
            setUser(null);
            return;
          }
          
          if (event === 'SIGNED_OUT' || !session) {
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(session.user);
          }
          setLoading(false);
        }
      );

      // Check for existing session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Session retrieval error:', error.message);
          // Don't force recovery on errors - just set no session
          // Could be network error, let user retry
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // If we have an existing session on iOS, initialize IAP (fire-and-forget)
        if (session && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
          setTimeout(async () => {
            try {
              const { initIap, setIapUserId } = await import('@/lib/iap');
              await initIap();
              await setIapUserId(session.user.id);
            } catch (error) {
              console.error('Failed to initialize IAP on session restore:', error);
            }
          }, 0);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, [healthCheckPerformed]);

  const signUp = async (email: string, password: string, userData?: any) => {
    // Validate credentials before sending to Supabase
    const validation = CredentialsSchema.safeParse({ email, password });
    if (!validation.success) {
      const error = { message: validation.error.issues[0].message };
      toast({
        title: "Invalid Password",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }

    // Dynamic redirect using auth callback for proper token handling
    const userRole = userData?.role || 'shopper';
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    // If signup successful and username provided, store it
    if (!error && data.user && userData?.username) {
      const { error: usernameError } = await supabase
        .from('users')
        .update({
          username: userData.username.toLowerCase(),
          onboarding_completed: true
        })
        .eq('id', data.user.id);

      if (usernameError?.code === '23505') {
        return { error: { message: 'Username already taken' } };
      }
    }

    if (error) {
      let errorMessage = error.message;
      let errorTitle = "Signup Failed";
      
      // Handle existing user case specially - return flag for UI handling
      if (error.message.includes('User already registered') || 
          error.message.includes('duplicate key') || 
          error.message.includes('already been taken')) {
        return { 
          error: { message: 'This email is already registered. Please log in or reset your password if needed.' }, 
          isExistingUser: true, 
          email: email 
        };
      } else if (error.message.includes('invalid email')) {
        errorTitle = "Invalid Email";
        errorMessage = "Please enter a valid email address.";
      } else if (error.message.includes('password')) {
        errorTitle = "Password Error";
        errorMessage = "Password must be at least 6 characters long.";
      }
      
      toast({
        title: errorTitle, 
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome to Azyah!",
        description: "Please check your email to verify your account."
      });
    }

    return { error };
  };


  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        let errorMessage = error.message;
        let errorTitle = "Login Failed";
        
        // Handle specific authentication errors
        if (error.message.includes('Failed to fetch') || error.message.includes('AuthRetryableFetchError')) {
          errorTitle = "Connection Error";
          errorMessage = "Unable to connect to authentication service. Please check your internet connection and try again.";
        } else if (error.message.includes('Invalid login credentials')) {
          errorTitle = "Invalid Credentials";
          errorMessage = "Incorrect email or password. Please check your credentials and try again.";
        } else if (error.message.includes('Email not confirmed')) {
          errorTitle = "Email Not Verified";
          errorMessage = "Please check your email and click the verification link before signing in.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorTitle = "Network Error";
          errorMessage = "Connection failed. Please check your internet connection and try again.";
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive"
        });
      }
      // Note: Success toast is shown in SignUp.tsx to avoid duplicate toasts

      return { error };
    } catch (err) {
      const networkError = {
        message: "Network connection failed. Please check your internet connection and try again."
      };
      
      toast({
        title: "Connection Error",
        description: networkError.message,
        variant: "destructive"
      });
      
      return { error: networkError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      // Log out from RevenueCat on iOS
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        try {
          const { logOutIap } = await import('@/lib/iap');
          await logOutIap();
        } catch (error) {
          console.error('Failed to log out from IAP:', error);
        }
      }
      
      // Clear all auth data first
      clearAllAuthData();
      
      // Attempt proper signout
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // Handle session not found errors gracefully
        if (error.message.includes('session_not_found') || error.message.includes('Session not found')) {
          console.log('Session already invalid during signout');
        } else {
          console.log('Signout error:', error.message);
          toast({
            title: "Signed Out",
            description: "You have been signed out.",
            variant: "default"
          });
        }
      }
      
      // Clear local state
      setSession(null);
      setUser(null);
      
      // Use callback for navigation if provided (set by App component)
      // This allows soft navigation instead of hard redirect
      if (signOutCallback) {
        signOutCallback();
      } else {
        // Fallback to hard redirect if no callback
        window.location.href = '/';
      }
      
    } catch (error) {
      console.error('Signout error:', error);
      // Force cleanup and redirect even on error
      clearAllAuthData();
      setSession(null);
      setUser(null);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }, [signOutCallback]);

  const updateProfile = async (data: any) => {
    if (!user) return { error: new Error('No user') };

    // SECURITY FIX: Remove role from data to prevent privilege escalation
    const { role, ...safeData } = data;

    const { error } = await supabase
      .from('users')
      .upsert({ 
        id: user.id,
        email: user.email!,
        ...safeData,
        updated_at: new Date().toISOString()
      });

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    // Allow setting signout callback from outside
    set onSignOutComplete(callback: (() => void) | undefined) {
      setSignOutCallback(() => callback || null);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
