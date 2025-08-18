import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, getRedirectRoute } from '@/lib/rbac';
import { getUserRole } from '@/lib/roleCache';
import type { UserRole } from '@/lib/rbac';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Fast role fetch with quick timeout for Visual Edits
      const timeoutId = setTimeout(() => {
        setUserRole('shopper'); // Default fallback
        setRoleLoading(false);
      }, 500);

      getUserRole(user).then(role => {
        setUserRole(role);
        setRoleLoading(false);
        clearTimeout(timeoutId);
      }).catch(() => {
        setUserRole('shopper'); // Default fallback
        setRoleLoading(false);
        clearTimeout(timeoutId);
      });

      return () => clearTimeout(timeoutId);
    } else {
      setRoleLoading(false);
    }
  }, [user]);

  // Immediate render for Visual Edits - minimal loading check
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle unauthenticated users
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based access control with fallback
  const currentPath = window.location.pathname;
  const effectiveRole = userRole || 'shopper';
  
  if (!canAccessRoute(effectiveRole, currentPath)) {
    return <Navigate to={getRedirectRoute(effectiveRole)} replace />;
  }

  // Check specific role requirements
  if (roles && userRole && !roles.includes(userRole)) {
    return <Navigate to={getRedirectRoute(userRole)} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;