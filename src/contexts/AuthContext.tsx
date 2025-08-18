
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CredentialsSchema } from '@/lib/password-validation';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { isPreviewEnvironment, storeSessionBackup, getSessionBackup, isLikelyPreviewRefresh } from '@/utils/sessionUtils';

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
    let cleanup: (() => void) | null = null;
    
    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthContext: Auth state changed:', { event, hasSession: !!session });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Emergency loading clear listener
    const handleForceLoadingClear = () => {
      setLoading(false);
    };
    
    window.addEventListener('azyah-force-loading-clear', handleForceLoadingClear);

    // Fast session initialization
    const initializeSession = async () => {
      try {
        // Much shorter timeout for Visual Edits compatibility
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 100))
        ]) as any;
        
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Session initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    cleanup = () => {
      subscription.unsubscribe();
      window.removeEventListener('azyah-force-loading-clear', handleForceLoadingClear);
    };

    return cleanup;
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
