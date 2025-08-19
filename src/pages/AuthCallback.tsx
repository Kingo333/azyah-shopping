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
        // 1) Ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to authenticate with Google.');
          return;
        }

        if (!session?.user) {
          setError('No active session returned from Google.');
          return;
        }

        // 2) Resolve role (URL param > localStorage fallback)
        const urlRole = searchParams.get('role') as UserRole | null;
        const storedRole = localStorage.getItem('signup_role') as UserRole | null;
        const role = urlRole || storedRole;

        // For existing users signing in, get role from metadata
        const existingRole = session.user.user_metadata?.role as UserRole;

        if (!role && !existingRole) {
          // Edge case: if role is missing, redirect to auth to pick one
          navigate('/auth?missingRole=1');
          return;
        }

        const finalRole = role || existingRole;

        // 3) For new signups, write role to user metadata
        if (role && role !== existingRole) {
          const { error: updateError } = await supabase.auth.updateUser({ 
            data: { role: finalRole } 
          });
          
          if (updateError) {
            console.error('Error updating user metadata:', updateError);
          }

          // 4) Upsert profile row for new users
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              role: finalRole
            }, {
              onConflict: 'id'
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }

        // 5) Clean up localStorage
        localStorage.removeItem('signup_role');

        // 6) Route based on role
        const redirectPath = getRedirectRoute(finalRole);
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