import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { canAccessRoute, getRedirectRoute } from '@/lib/rbac';
import { getUserRole } from '@/lib/roleCache';
import type { UserRole } from '@/lib/rbac';
import { isVisualEditsMode } from '@/utils/visualEditsDetection';
import { isPaymentReturnPage, getPaymentSessionBackup } from '@/utils/paymentSessionManager';
import { supabase } from '@/integrations/supabase/client';

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
  const [authStable, setAuthStable] = useState(isVisualEditsMode()); // Immediately stable in Visual Edits
  const [sessionRestoreAttempted, setSessionRestoreAttempted] = useState(false);

  useEffect(() => {
    // In Visual Edits mode, skip stability delay for immediate response
    if (isVisualEditsMode()) {
      setAuthStable(true);
      return;
    }

    // Extended delay for payment return pages to allow session restoration
    const isPaymentReturn = isPaymentReturnPage();
    const delay = isPaymentReturn ? 200 : 50;

    const stabilityTimer = setTimeout(() => {
      setAuthStable(true);
    }, delay);

    return () => clearTimeout(stabilityTimer);
  }, []);

  // Attempt session restoration from payment backup if user is missing
  useEffect(() => {
    const attemptSessionRestore = async () => {
      if (!user && !loading && !sessionRestoreAttempted && isPaymentReturnPage()) {
        setSessionRestoreAttempted(true);
        const backup = getPaymentSessionBackup();
        if (backup) {
          try {
            if (DEBUG_AUTH) console.log('ProtectedRoute: Attempting session restore from payment backup');
            await supabase.auth.setSession({
              access_token: backup.session.access_token,
              refresh_token: backup.session.refresh_token
            });
          } catch (error) {
            console.error('ProtectedRoute: Failed to restore session from backup:', error);
          }
        }
      }
    };

    attemptSessionRestore();
  }, [user, loading, sessionRestoreAttempted]);

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
        // Strict fallback - no role means no access except for shoppers
        const fallbackRole: UserRole = 'shopper';
        setUserRole(fallbackRole);
      } finally {
        setRoleLoading(false);
      }
    };

    if (user) {
      // In Visual Edits mode, prioritize immediate role resolution
      if (isVisualEditsMode()) {
        setRoleLoading(false);
        const metadataRole = user.user_metadata?.role;
        if (metadataRole && ['shopper', 'brand', 'retailer', 'admin'].includes(metadataRole)) {
          setUserRole(metadataRole as UserRole);
          return;
        }
      }
      fetchUserRole();
    } else {
      setRoleLoading(false);
    }
  }, [user]);

  // Show loading state while auth is initializing or auth state is not stable
  if (loading || !authStable) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: Showing loading - loading:', loading, 'authStable:', authStable);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't redirect immediately if still fetching role
  if (user && roleLoading) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: User exists but role loading, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to auth if we're certain there's no user AND auth is stable
  if (!user && !loading && authStable) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: No user detected, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Strict Role-based access control - ALWAYS apply if we have a user
  if (user && userRole) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: Checking access for role:', userRole, 'route:', location.pathname);
    
    // STRICT: If specific roles are required, user MUST have one of them
    if (roles && roles.length > 0) {
      if (!roles.includes(userRole)) {
        const redirectTo = getRedirectRoute(userRole);
        if (DEBUG_AUTH) console.log('ProtectedRoute: STRICT - Role not in required roles, redirecting to:', redirectTo);
        return <Navigate to={redirectTo} replace />;
      }
    }

    // STRICT: Check if user can access the current route (no fallbacks)
    if (!canAccessRoute(userRole, location.pathname)) {
      const redirectTo = getRedirectRoute(userRole);
      if (DEBUG_AUTH) console.log('ProtectedRoute: STRICT - Cannot access route, redirecting to:', redirectTo);
      return <Navigate to={redirectTo} replace />;
    }
  }

  // STRICT: If we have a user but no role, block access (except for auth pages)
  if (user && !userRole && !location.pathname.includes('/auth')) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: STRICT - User without role, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;