
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CredentialsSchema } from '@/lib/password-validation';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { isVisualEditsMode, setStableAuthState, getStableAuthState, clearStableAuthState } from '@/utils/visualEditsDetection';

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
    console.log('AuthProvider: Setting up auth listener');
    
    // Get initial session with Visual Edits stability
    const initializeAuth = async () => {
      // In Visual Edits mode, try stable auth state first
      if (isVisualEditsMode()) {
        const stableAuth = getStableAuthState();
        if (stableAuth && stableAuth.user) {
          console.log('AuthProvider: Using stable auth state for Visual Edits');
          setSession(stableAuth.session);
          setUser(stableAuth.user);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to fresh session check
      const { data: { session } } = await supabase.auth.getSession();
      console.log('AuthProvider: Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Store stable auth state if we have a session
      if (session?.user) {
        setStableAuthState(session.user, session);
      }
    };
    
    initializeAuth();

    // Listen for auth changes with Visual Edits protection
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change:', event, session?.user?.email);
        
        // In Visual Edits mode, be more conservative about auth changes
        if (isVisualEditsMode()) {
          // If we lose session in Visual Edits, try to recover from stable state
          if (!session && event !== 'SIGNED_OUT') {
            const stableAuth = getStableAuthState();
            if (stableAuth && stableAuth.user) {
              console.log('AuthProvider: Recovering auth state in Visual Edits mode');
              setSession(stableAuth.session);
              setUser(stableAuth.user);
              return;
            }
          }
          
          // Only update if we have a clear session change
          if (session || event === 'SIGNED_OUT') {
            setSession(session);
            setUser(session?.user ?? null);
          }
        } else {
          // Normal mode - apply all auth changes
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
        
        // Store stable auth state for Visual Edits compatibility
        if (session?.user) {
          setStableAuthState(session.user, session);
        } else if (!isVisualEditsMode()) {
          // Only clear stable auth if not in Visual Edits mode
          clearStableAuthState();
        }
        
        // Clear role cache on sign out only if not in Visual Edits mode
        if (event === 'SIGNED_OUT' && !isVisualEditsMode()) {
          import('@/lib/roleCache').then(({ clearRoleCache }) => {
            clearRoleCache();
          });
        }
      }
    );

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
      toast({
        title: "Signup Failed", 
        description: error.message,
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

    const { error } = await supabase
      .from('users')
      .upsert({ 
        id: user.id,
        email: user.email!,
        ...data,
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
