import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { getUserRole } from '@/lib/roleCache';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';

interface AuthAwareRouteProps {
  children: React.ReactNode;
  /** If true, redirects authenticated users to their dashboard */
  redirectAuthenticatedTo?: 'dashboard';
}

/**
 * AuthAwareRoute - Shows loading during auth initialization, 
 * then either renders children (for unauthenticated users) 
 * or redirects to appropriate dashboard (for authenticated users).
 * 
 * Use this on public routes like the IntroCarousel to prevent 
 * authenticated users from seeing onboarding content.
 */
const AuthAwareRoute = ({ children, redirectAuthenticatedTo }: AuthAwareRouteProps) => {
  const { user, session, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      // Wait for auth to finish loading
      if (loading) return;

      // No session = show the public content (IntroCarousel)
      if (!session || !user) {
        setChecking(false);
        return;
      }

      // User is authenticated - determine their dashboard
      if (redirectAuthenticatedTo === 'dashboard') {
        try {
          const role = await getUserRole(user);
          const dashboard = getRedirectRoute(role);
          console.log('AuthAwareRoute: Authenticated user, redirecting to:', dashboard);
          setRedirectPath(dashboard);
        } catch (error) {
          console.error('AuthAwareRoute: Error getting role, defaulting to /swipe');
          setRedirectPath('/swipe');
        }
      }
      
      setChecking(false);
    };

    checkAuthAndRole();
  }, [user, session, loading, redirectAuthenticatedTo]);

  // Show loading while auth is initializing or we're checking role
  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to their dashboard
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  // Show public content for unauthenticated users
  return <>{children}</>;
};

export default AuthAwareRoute;
