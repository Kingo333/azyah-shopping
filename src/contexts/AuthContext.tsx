
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
    // Simple auth state management
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthContext: Auth state changed:', { event, user: session?.user?.email });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Ensure portal setup when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            ensureUserPortalSetup(session.user, session.user.user_metadata?.role);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
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

    // Redirect to email confirmation page to avoid fetch errors
    const redirectUrl = `${window.location.origin}/email-confirmed`;
    
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

  // Helper function to ensure user portal setup
  const ensureUserPortalSetup = async (user: any, role?: string) => {
    try {
      const userRole = role || user.user_metadata?.role || 'shopper';
      console.log('Setting up portal for user role:', userRole);
      
      if (userRole === 'brand') {
        const { data: existingBrand } = await supabase
          .from('brands')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();
          
        if (!existingBrand) {
          console.log('Creating brand for user:', user.id);
          const defaultName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Brand';
          const baseSlug = defaultName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          
          const { data, error } = await supabase.from('brands').insert({
            owner_user_id: user.id,
            name: defaultName,
            slug: `${baseSlug}-${Date.now()}`,
            contact_email: user.email,
            bio: null,
            website: null,
            logo_url: null,
            socials: {},
            shipping_regions: []
          }).select().single();
          
          if (error) {
            console.error('Error creating brand:', error);
            toast({
              title: "Brand Setup Error",
              description: "Unable to create your brand portal. Please try again or contact support.",
              variant: "destructive"
            });
            throw error;
          }
          
          console.log('Brand created successfully:', data);
          toast({
            title: "Welcome to Azyah!",
            description: "Your brand portal has been set up. Complete your profile to get started.",
          });
        }
      } else if (userRole === 'retailer') {
        const { data: existingRetailer } = await supabase
          .from('retailers')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();
          
        if (!existingRetailer) {
          console.log('Creating retailer for user:', user.id);
          const defaultName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Store';
          const baseSlug = defaultName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          
          const { data, error } = await supabase.from('retailers').insert({
            owner_user_id: user.id,
            name: defaultName,
            slug: `${baseSlug}-${Date.now()}`,
            contact_email: user.email,
          }).select().single();
          
          if (error) {
            console.error('Error creating retailer:', error);
            throw error;
          }
          
          console.log('Retailer created successfully:', data);
          toast({
            title: "Welcome to Azyah!",
            description: "Your retailer portal has been set up. Complete your profile to get started.",
          });
        }
      }
    } catch (error) {
      console.error('Error setting up user portal:', error);
      toast({
        title: "Setup Error",
        description: "There was an issue setting up your portal. Please refresh the page.",
        variant: "destructive"
      });
    }
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
