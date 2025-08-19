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

        // 2) Check the intent from URL params or localStorage
        const intent = searchParams.get('intent') || localStorage.getItem('auth_intent') || 'signup';
        const urlRole = searchParams.get('role') as UserRole | null;
        const storedRole = localStorage.getItem('signup_role') as UserRole | null;
        
        // 3) Check if this is a new user (user was just created)
        const userCreatedAt = new Date(session.user.created_at);
        const now = new Date();
        const isNewUser = (now.getTime() - userCreatedAt.getTime()) < 5000; // Created within last 5 seconds

        // 4) Handle sign-in intent with new user (should not auto-create)
        if (intent === 'signin' && isNewUser) {
          // Delete the auto-created user account
          await supabase.auth.signOut();
          
          setError('No account found. Please sign up first or use email/password to sign in.');
          return;
        }

        // 5) For existing users, get role from metadata
        const existingRole = session.user.user_metadata?.role as UserRole;
        
        // 6) For sign up or existing users, resolve the role
        const role = urlRole || storedRole;

        if (intent === 'signup' && !role && !existingRole) {
          // Edge case: if role is missing for signup, redirect to auth to pick one
          navigate('/auth?missingRole=1');
          return;
        }

        const finalRole = role || existingRole || 'shopper';

        // 7) For new signups or users without role, update user metadata
        if (isNewUser || (role && role !== existingRole)) {
          const { error: updateError } = await supabase.auth.updateUser({ 
            data: { role: finalRole } 
          });
          
          if (updateError) {
            console.error('Error updating user metadata:', updateError);
          }

          // 8) Upsert profile row for new users
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

        // 9) Clean up localStorage
        localStorage.removeItem('signup_role');
        localStorage.removeItem('auth_intent');

        // 10) Route based on role
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