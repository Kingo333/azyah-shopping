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
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (user) {
      // Ultra-fast role resolution for Visual Edits compatibility
      timeoutId = setTimeout(() => {
        setUserRole('shopper'); // Default fallback
        setRoleLoading(false);
      }, 50); // Reduced from 500ms to 50ms

      getUserRole(user).then(role => {
        if (timeoutId) clearTimeout(timeoutId);
        setUserRole(role);
        setRoleLoading(false);
      }).catch(() => {
        if (timeoutId) clearTimeout(timeoutId);
        setUserRole('shopper'); // Default fallback
        setRoleLoading(false);
      });
    } else {
      setRoleLoading(false);
    }

    // Emergency loading clear listener
    const handleForceLoadingClear = () => {
      if (timeoutId) clearTimeout(timeoutId);
      setRoleLoading(false);
      setUserRole(userRole || 'shopper');
    };
    
    window.addEventListener('azyah-force-loading-clear', handleForceLoadingClear);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('azyah-force-loading-clear', handleForceLoadingClear);
    };
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