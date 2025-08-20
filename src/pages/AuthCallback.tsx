import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1) Exchange code from the URL for a session
        const { data: exchanged, error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exErr) {
          console.error('exchangeCodeForSession error:', exErr);
          // Let AuthContext handle the session via onAuthStateChange
        }

        // Wait a bit for AuthContext to pick up the session
        setTimeout(() => {
          if (!session?.user) {
            setError('Authentication failed. Please try again.');
            return;
          }

          const intent = (searchParams.get('intent') || 
                         localStorage.getItem('auth_intent') || 
                         'signin') as 'signin' | 'signup';
          
          const roleParam = searchParams.get('role') as UserRole | null;

          // Handle the user profile creation/update
          handleUserProfile(session.user, intent, roleParam);
        }, 1000);

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setError(error.message ?? 'OAuth callback error');
      }
    };

    const handleUserProfile = async (user: any, intent: 'signin' | 'signup', roleParam: UserRole | null) => {
      try {
        // Load existing user if any
        const { data: existing } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (intent === 'signup') {
          const role: UserRole = roleParam ||
            (localStorage.getItem('signup_role') as UserRole) ||
            'shopper';

          await supabase.auth.updateUser({ data: { role } });
          await supabase.from('users').upsert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role
          }, {
            onConflict: 'id'
          });
        } else {
          // intent === 'signin'
          if (!existing?.id || !existing.role) {
            navigate('/select-role?from=signin', { replace: true });
            return;
          }
        }

        // Resolve role for routing
        const { data: userRow } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = (userRow?.role ||
          roleParam ||
          localStorage.getItem('signup_role') ||
          'shopper') as UserRole;

        // Clean up localStorage
        localStorage.removeItem('signup_role');
        localStorage.removeItem('auth_intent');

        // Route based on role
        const redirectPath = getRedirectRoute(role);
        navigate(redirectPath, { replace: true });

      } catch (error: any) {
        console.error('Profile handling error:', error);
        setError(error.message ?? 'Profile setup error');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  // Also handle when session becomes available through AuthContext
  useEffect(() => {
    if (session?.user) {
      const intent = (searchParams.get('intent') || 
                     localStorage.getItem('auth_intent') || 
                     'signin') as 'signin' | 'signup';
      
      const roleParam = searchParams.get('role') as UserRole | null;
      
      // Only proceed if we haven't already processed this
      if (localStorage.getItem('auth_intent') || localStorage.getItem('signup_role')) {
        handleUserProfile(session.user, intent, roleParam);
      }
    }
  }, [session, searchParams, navigate]);

  const handleUserProfile = async (user: any, intent: 'signin' | 'signup', roleParam: UserRole | null) => {
    try {
      // Load existing user if any
      const { data: existing } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (intent === 'signup') {
        const role: UserRole = roleParam ||
          (localStorage.getItem('signup_role') as UserRole) ||
          'shopper';

        await supabase.auth.updateUser({ data: { role } });
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role
        }, {
          onConflict: 'id'
        });
      } else {
        // intent === 'signin'
        if (!existing?.id || !existing.role) {
          navigate('/select-role?from=signin', { replace: true });
          return;
        }
      }

      // Resolve role for routing
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = (userRow?.role ||
        roleParam ||
        localStorage.getItem('signup_role') ||
        'shopper') as UserRole;

      // Clean up localStorage
      localStorage.removeItem('signup_role');
      localStorage.removeItem('auth_intent');

      // Route based on role
      const redirectPath = getRedirectRoute(role);
      navigate(redirectPath, { replace: true });

    } catch (error: any) {
      console.error('Profile handling error:', error);
      setError(error.message ?? 'Profile setup error');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button 
            onClick={() => navigate('/auth')}
            className="text-primary hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Finalizing sign-in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;