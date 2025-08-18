import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { canAccessRoute, getRedirectRoute } from '@/lib/rbac';
import { getUserRole, clearRoleCache } from '@/lib/roleCache';
import type { UserRole } from '@/lib/rbac';

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
    const fetchUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const role = await getUserRole(user);
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

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't redirect immediately if still fetching role
  if (user && roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to auth if we're certain there's no user
  if (!user && !loading) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role-based access control - only apply if we have a role
  if (user && userRole) {
    // If specific roles are required, check if user has one of them
    if (roles && roles.length > 0) {
      if (!roles.includes(userRole)) {
        const redirectTo = getRedirectRoute(userRole);
        return <Navigate to={redirectTo} replace />;
      }
    }

    // Check if user can access the current route
    if (!canAccessRoute(userRole, location.pathname)) {
      const redirectTo = getRedirectRoute(userRole);
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;