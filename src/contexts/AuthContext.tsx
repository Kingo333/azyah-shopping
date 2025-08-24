
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CredentialsSchema } from '@/lib/password-validation';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { isVisualEditsMode, setStableAuthState, getStableAuthState, clearStableAuthState } from '@/utils/visualEditsDetection';
import { 
  getPaymentSessionBackup, 
  clearPaymentSessionBackup, 
  isPaymentFlowActive, 
  isPaymentReturnPage 
} from '@/utils/paymentSessionManager';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from stable storage if in Visual Edits mode
    if (isVisualEditsMode()) {
      const stableState = getStableAuthState();
      if (stableState && Date.now() - stableState.timestamp < 10 * 60 * 1000) { // 10 min validity
        setSession(stableState.session);
        setUser(stableState.user);
        setLoading(false);
        return;
      }
    }

    // Check for payment session backup first (handles returning from payment)
    const handlePaymentReturn = () => {
      if (isPaymentReturnPage()) {
        const paymentBackup = getPaymentSessionBackup();
        if (paymentBackup) {
          console.log('Restoring session from payment backup');
          setSession(paymentBackup.session);
          setUser(paymentBackup.user);
          setStableAuthState(paymentBackup.user, paymentBackup.session);
          setLoading(false);
          
          // Only clear backup if not on payment-cancel (let cancel page handle it)
          if (!window.location.pathname.includes('/payment-cancel')) {
            setTimeout(() => clearPaymentSessionBackup(), 1000);
          }
          return true;
        }
      }
      return false;
    };

    // Try to restore from payment backup first
    if (handlePaymentReturn()) {
      return;
    }

    // Set up auth state listener with payment flow awareness
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthContext: Auth state changed:', { event, user: session?.user?.email });
        
        // Prevent logout during payment flow unless explicitly signed out
        if (event === 'SIGNED_OUT' && isPaymentFlowActive() && !isPaymentReturnPage()) {
          console.log('Preventing logout during payment flow');
          return;
        }
        
        // Store stable auth state for Visual Edits compatibility
        if (session?.user) {
          setStableAuthState(session.user, session);
        } else if (event === 'SIGNED_OUT') {
          clearStableAuthState();
          clearPaymentSessionBackup(); // Clear payment backup on explicit logout
        }
        
        // Clear role cache on sign out only if not in Visual Edits mode
        if (event === 'SIGNED_OUT' && !isVisualEditsMode() && !isPaymentFlowActive()) {
          import('@/lib/roleCache').then(({ clearRoleCache }) => {
            clearRoleCache();
          });
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session with payment flow awareness
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && isPaymentFlowActive()) {
        // Try to restore from payment backup if session check fails during payment
        const paymentBackup = getPaymentSessionBackup();
        if (paymentBackup) {
          console.log('Session check failed, restoring from payment backup');
          setSession(paymentBackup.session);
          setUser(paymentBackup.user);
          setStableAuthState(paymentBackup.user, paymentBackup.session);
          setLoading(false);
          return;
        }
      }

      if (session?.user) {
        setStableAuthState(session.user, session);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    // Create role-based redirect URL
    const userRole = (userData?.role || 'shopper') as UserRole;
    const redirectPath = getRedirectRoute(userRole);
    const redirectUrl = `${window.location.origin}${redirectPath}`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    if (error) {
      let errorMessage = error.message;
      let errorTitle = "Signup Failed";
      
      // Provide better error messages for common cases
      if (error.message.includes('User already registered')) {
        errorTitle = "Account Already Exists";
        errorMessage = "An account with this email already exists. Please sign in instead or use a different email.";
      } else if (error.message.includes('duplicate key') || error.message.includes('already been taken')) {
        errorTitle = "Email Already Used";
        errorMessage = "This email is already registered. Please sign in instead or use a different email.";
      } else if (error.message.includes('invalid email')) {
        errorTitle = "Invalid Email";
        errorMessage = "Please enter a valid email address.";
      } else if (error.message.includes('password')) {
        errorTitle = "Password Error";
        errorMessage = "Password must be at least 8 characters long.";
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Handle session not found errors gracefully
      if (error.message.includes('session_not_found') || error.message.includes('Session not found')) {
        // Session was already invalid, just redirect
        window.location.href = '/';
      } else {
        toast({
          title: "Logout Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      // Redirect to landing page after sign out
      window.location.href = '/';
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
