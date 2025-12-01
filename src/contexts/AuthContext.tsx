
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CredentialsSchema } from '@/lib/password-validation';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { 
  performSessionHealthCheck, 
  shouldPerformHealthCheck, 
  recoverFromAuthError, 
  clearAllAuthData 
} from '@/utils/sessionHealthCheck';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any; isExistingUser?: boolean; email?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthCheckPerformed, setHealthCheckPerformed] = useState(false);

  useEffect(() => {
    // Perform health check on app startup
    const initializeAuth = async () => {
      if (shouldPerformHealthCheck() && !healthCheckPerformed) {
        console.log('Performing startup session health check...');
        setHealthCheckPerformed(true);
        const isHealthy = await performSessionHealthCheck();
        
        if (!isHealthy) {
          console.log('Session unhealthy - clearing state');
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
          
          // Handle OAuth sign-in events
          if (event === 'SIGNED_IN' && session) {
            const provider = session.user.app_metadata?.provider;
            const role = session.user.user_metadata?.role || 'shopper';
            console.log('OAuth sign-in detected:', { provider, role });
          }
          
          // Handle auth errors proactively
          if (event === 'TOKEN_REFRESHED' && !session) {
            console.log('Token refresh failed - initiating recovery');
            await recoverFromAuthError();
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
          console.log('Session retrieval error:', error);
          await recoverFromAuthError();
          return;
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

    // Dynamic redirect based on role - go directly to dashboard
    const userRole = userData?.role || 'shopper';
    const redirectUrl = `${window.location.origin}/dashboard`;
    
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
          error: { message: 'This email is already registered. If you signed up with Google, please use "Continue with Google" instead.' }, 
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
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in."
        });
      }

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

  const signOut = async () => {
    try {
      setLoading(true);
      
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
            description: "You have been signed out. Redirecting...",
            variant: "default"
          });
        }
      }
      
      // Clear local state
      setSession(null);
      setUser(null);
      
      // Always redirect to landing page
      window.location.href = '/';
      
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
  };

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
    updateProfile
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
