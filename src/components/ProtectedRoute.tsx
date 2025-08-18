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
        console.log('ProtectedRoute: No user found');
        setRoleLoading(false);
        return;
      }

      console.log('ProtectedRoute: Getting role for user:', user.id, user.email);

      try {
        // Use the optimized role cache system
        const role = await getUserRole(user);
        console.log('ProtectedRoute: Got user role:', role);
        setUserRole(role);
      } catch (error) {
        console.error('ProtectedRoute: Error getting user role:', error);
        // Clear any corrupt cache and fallback to default
        clearRoleCache(user.id);
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

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (userRole) {
    console.log('ProtectedRoute: Current route:', location.pathname, 'User role:', userRole);
    
    // If specific roles are required, check if user has one of them
    if (roles && roles.length > 0) {
      console.log('ProtectedRoute: Required roles:', roles, 'User has role:', userRole);
      if (!roles.includes(userRole)) {
        const redirectTo = getRedirectRoute(userRole);
        console.log('ProtectedRoute: User role not allowed, redirecting to:', redirectTo);
        return <Navigate to={redirectTo} replace />;
      }
    }

    // Check if user can access the current route
    if (!canAccessRoute(userRole, location.pathname)) {
      const redirectTo = getRedirectRoute(userRole);
      console.log('ProtectedRoute: Route not accessible, redirecting to:', redirectTo);
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;