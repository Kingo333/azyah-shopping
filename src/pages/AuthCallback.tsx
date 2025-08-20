import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setError('No active session returned from Google.');
          return;
        }

        const intent = (searchParams.get('intent') || 
                       (typeof window !== 'undefined' && localStorage.getItem('auth_intent')) || 
                       'signin') as 'signin' | 'signup';
        const roleParam = searchParams.get('role') as UserRole | null;

        // Load existing user if any
        const { data: existing } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (intent === 'signup') {
          const role: UserRole = roleParam ||
            (typeof window !== 'undefined' && localStorage.getItem('signup_role') as UserRole) ||
            'shopper';

          await supabase.auth.updateUser({ data: { role } });
          await supabase.from('users').upsert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            role
          }, {
            onConflict: 'id'
          });
        } else {
          // intent === 'signin'
          if (!existing?.id || !existing.role) {
            // No profile or no role: send them to pick one
            navigate('/select-role?from=signin', { replace: true });
            return;
          }
        }

        // Resolve role for routing
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        const role = (user?.role ||
          roleParam ||
          (typeof window !== 'undefined' && localStorage.getItem('signup_role')) ||
          'shopper') as UserRole;

        // Clean up localStorage
        localStorage.removeItem('signup_role');
        localStorage.removeItem('auth_intent');

        // Route based on role
        const redirectPath = getRedirectRoute(role);
        navigate(redirectPath, { replace: true });

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setError(error.message ?? 'OAuth callback error');
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