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
        console.log('AuthCallback: Starting OAuth code exchange...');
        
        // 1) Exchange code from the URL for a session
        const { data: exchanged, error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exErr) {
          console.error('exchangeCodeForSession error:', exErr);
        }

        // 2) Wait for session to be available
        let attempts = 0;
        const checkSession = async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          console.log('AuthCallback: Session check attempt', attempts, 'session exists:', !!currentSession?.user);
          
          if (currentSession?.user) {
            console.log('AuthCallback: Session found, processing user profile...');
            await handleUserProfile(currentSession.user);
          } else if (attempts < 5) {
            attempts++;
            setTimeout(checkSession, 500);
          } else {
            setError('Authentication failed. Please try again.');
          }
        };

        await checkSession();

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setError(error.message ?? 'OAuth callback error');
      }
    };

    const handleUserProfile = async (user: any) => {
      try {
        console.log('AuthCallback: Processing user profile for:', user.email);
        
        const intent = (searchParams.get('intent') || 
                       localStorage.getItem('auth_intent') || 
                       'signin') as 'signin' | 'signup';
        
        const roleParam = searchParams.get('role') as UserRole | null;
        
        console.log('AuthCallback: Intent:', intent, 'Role param:', roleParam);

        // Load existing user if any
        const { data: existing } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        console.log('AuthCallback: Existing user:', existing);

        if (intent === 'signup') {
          const role: UserRole = roleParam ||
            (localStorage.getItem('signup_role') as UserRole) ||
            'shopper';

          console.log('AuthCallback: Creating user with role:', role);

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
            console.log('AuthCallback: No existing user/role, redirecting to select-role');
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

        console.log('AuthCallback: Final role for routing:', role);

        // Clean up localStorage
        localStorage.removeItem('signup_role');
        localStorage.removeItem('auth_intent');

        // Route based on role
        const redirectPath = getRedirectRoute(role);
        console.log('AuthCallback: Redirecting to:', redirectPath);
        navigate(redirectPath, { replace: true });

      } catch (error: any) {
        console.error('Profile handling error:', error);
        setError(error.message ?? 'Profile setup error');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

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