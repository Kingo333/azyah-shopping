import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { canAccessRoute, getRedirectRoute } from '@/lib/rbac';
import { getUserRole, clearRoleCache } from '@/lib/roleCache';
import type { UserRole } from '@/lib/rbac';

const DEBUG_AUTH = process.env.NODE_ENV === 'development';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [authStable, setAuthStable] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure auth state is stable
    const stabilityTimer = setTimeout(() => {
      setAuthStable(true);
    }, 100);

    return () => clearTimeout(stabilityTimer);
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        if (DEBUG_AUTH) console.log('ProtectedRoute: No user, setting roleLoading to false');
        setRoleLoading(false);
        return;
      }

      if (DEBUG_AUTH) console.log('ProtectedRoute: Fetching role for user:', user.id);

      try {
        const role = await getUserRole(user);
        if (DEBUG_AUTH) console.log('ProtectedRoute: Got user role:', role);
        setUserRole(role);
      } catch (error) {
        console.error('ProtectedRoute: Error getting user role:', error);
        // Simple fallback without cache clearing
        setUserRole('shopper');
      } finally {
        setRoleLoading(false);
      }
    };

    if (user) {
      fetchUserRole();
    } else {
      setRoleLoading(false);
    }
  }, [user]);

  // Extended loading state for preview environment stability
  if (loading || !authStable || (user && roleLoading)) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: Showing loading - loading:', loading, 'authStable:', authStable, 'roleLoading:', roleLoading);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Enhanced session validation for preview environment
  const isPreviewEnvironment = window.location.hostname.includes('lovable');
  
  // Only redirect to auth if we're absolutely certain there's no valid session
  if (!user && !loading && authStable && !roleLoading) {
    // Extra validation for preview environment
    if (isPreviewEnvironment) {
      // Give more time for session recovery in preview mode
      if (DEBUG_AUTH) console.log('ProtectedRoute: Preview environment detected, checking session validity');
      
      // Check if session exists in storage before redirecting
      const storedSession = localStorage.getItem('azyah-auth-token');
      if (storedSession) {
        if (DEBUG_AUTH) console.log('ProtectedRoute: Found stored session, waiting for recovery');
        return (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
      }
    }
    
    if (DEBUG_AUTH) console.log('ProtectedRoute: No user detected, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role-based access control - only apply if we have a role
  if (user && userRole) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: Checking access for role:', userRole, 'route:', location.pathname);
    
    // If specific roles are required, check if user has one of them
    if (roles && roles.length > 0) {
      if (!roles.includes(userRole)) {
        const redirectTo = getRedirectRoute(userRole);
        if (DEBUG_AUTH) console.log('ProtectedRoute: Role not in required roles, redirecting to:', redirectTo);
        return <Navigate to={redirectTo} replace />;
      }
    }

    // Check if user can access the current route
    if (!canAccessRoute(userRole, location.pathname)) {
      const redirectTo = getRedirectRoute(userRole);
      if (DEBUG_AUTH) console.log('ProtectedRoute: Cannot access route, redirecting to:', redirectTo);
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;