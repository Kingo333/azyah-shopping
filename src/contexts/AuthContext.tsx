
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CredentialsSchema } from '@/lib/password-validation';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';

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
    // Session recovery for preview environments
    const recoverSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          console.log('AuthContext: Session recovered successfully');
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return true;
        }
      } catch (error) {
        console.warn('AuthContext: Session recovery failed:', error);
      }
      return false;
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', { 
          event, 
          user: session?.user?.email,
          hasSession: !!session,
          timestamp: new Date().toISOString()
        });
        
        // Handle session lost during preview refresh
        if (event === 'SIGNED_OUT' && !session) {
          // Check if this is an unexpected sign out (preview refresh)
          const recovered = await recoverSession();
          if (!recovered) {
            // Clear role cache only on actual sign out
            import('@/lib/roleCache').then(({ clearRoleCache }) => {
              clearRoleCache();
            });
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Initial session check with retry for preview environment
    const initializeSession = async () => {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (!error) {
            console.log('AuthContext: Initial session check:', { 
              hasSession: !!session, 
              attempt: attempts + 1 
            });
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.warn(`AuthContext: Session check attempt ${attempts + 1} failed:`, error);
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        }
      }
      
      // Final fallback
      setLoading(false);
    };

    initializeSession();

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
