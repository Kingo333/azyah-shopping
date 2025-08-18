import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { canAccessRoute, getRedirectRoute, isRoleSpecificRoute } from '@/lib/rbac';
import { getUserRole, clearRoleCache } from '@/lib/roleCache';
import type { UserRole } from '@/lib/rbac';
import { isPreviewEnvironment, getSessionBackup } from '@/utils/sessionUtils';

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

  useEffect(() => {
    if (!user) {
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);
    
    // Add timeout for role fetching to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setUserRole('shopper');
      setRoleLoading(false);
    }, 2000);
    
    getUserRole(user)
      .then((role) => {
        clearTimeout(timeoutId);
        setUserRole(role);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('ProtectedRoute: Error getting user role:', error);
        setUserRole('shopper');
      })
      .finally(() => {
        setRoleLoading(false);
      });

    return () => clearTimeout(timeoutId);
  }, [user]);

  // Simplified loading check for Visual Edits
  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Enhanced session validation for all roles in preview environment
  const isPreview = isPreviewEnvironment();
  
  // Only redirect to auth if we're absolutely certain there's no valid session
  if (!user && !loading && !roleLoading) {
    // Extra validation for preview environment with role-specific handling
    if (isPreview) {
      if (DEBUG_AUTH) console.log('ProtectedRoute: Preview environment detected, checking all session indicators');
      
      // Check multiple session indicators
      const storedSession = localStorage.getItem('azyah-auth-token');
      const sessionBackup = getSessionBackup();
      const isProtectedRoute = isRoleSpecificRoute(location.pathname);
      
      if (storedSession || sessionBackup || isProtectedRoute) {
        if (DEBUG_AUTH) console.log('ProtectedRoute: Found session indicators, waiting for recovery', {
          storedSession: !!storedSession,
          sessionBackup: !!sessionBackup,
          isProtectedRoute,
          pathname: location.pathname
        });
        return (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
      }
    }
    
    if (DEBUG_AUTH) console.log('ProtectedRoute: No user detected after all checks, redirecting to auth');
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