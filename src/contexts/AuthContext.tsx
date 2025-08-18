
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
    // Set up auth state listener with enhanced preview environment handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', { 
          event, 
          user: session?.user?.email,
          hasSession: !!session,
          timestamp: new Date().toISOString(),
          isPreview: isPreviewEnvironment()
        });
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Store backup for all roles in preview environment
          if (session?.user && isPreviewEnvironment()) {
            storeSessionBackup(session.user, session);
          }
        } else if (event === 'SIGNED_OUT') {
          // Enhanced logic for all roles
          const isLikelyRefresh = isLikelyPreviewRefresh();
          
          if (isLikelyRefresh) {
            console.log('AuthContext: Preview refresh detected for role-based route, attempting recovery');
            
            // Try to recover from backup
            const backup = getSessionBackup();
            if (backup) {
              setSession(backup.session);
              setUser(backup.user);
              console.log('AuthContext: Session restored from backup');
              return;
            }
            
            // Wait briefly for session recovery
            setTimeout(async () => {
              const { data: { session: recoveredSession } } = await supabase.auth.getSession();
              if (recoveredSession) {
                setSession(recoveredSession);
                setUser(recoveredSession.user);
                console.log('AuthContext: Session recovered after brief delay');
              } else {
                // Final fallback - clear everything
                setSession(null);
                setUser(null);
                import('@/lib/roleCache').then(({ clearRoleCache }) => {
                  clearRoleCache();
                });
              }
            }, 1000);
          } else {
            // Real logout - clear everything immediately
            console.log('AuthContext: Real logout detected, clearing all session data');
            setSession(null);
            setUser(null);
            import('@/lib/roleCache').then(({ clearRoleCache }) => {
              clearRoleCache();
            });
            import('@/utils/sessionUtils').then(({ clearSessionBackup }) => {
              clearSessionBackup();
            });
          }
        }
        
        setLoading(false);
      }
    );

    // Enhanced initial session check for all roles
    const initializeSession = async () => {
      let attempts = 0;
      const maxAttempts = isPreviewEnvironment() ? 5 : 3;
      
      while (attempts < maxAttempts) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (!error && session) {
            console.log('AuthContext: Initial session found:', { 
              hasSession: !!session, 
              attempt: attempts + 1,
              userRole: session.user?.user_metadata?.role 
            });
            setSession(session);
            setUser(session?.user ?? null);
            
            // Store backup for preview environment
            if (isPreviewEnvironment()) {
              storeSessionBackup(session.user, session);
            }
            
            setLoading(false);
            return;
          } else if (!session && isPreviewEnvironment()) {
            // Try backup recovery in preview environment
            const backup = getSessionBackup();
            if (backup) {
              console.log('AuthContext: Using backup session on initialization');
              setSession(backup.session);
              setUser(backup.user);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn(`AuthContext: Session check attempt ${attempts + 1} failed:`, error);
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempts));
        }
      }
      
      console.log('AuthContext: No session found after all attempts');
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
