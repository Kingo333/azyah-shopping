import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { canAccessRoute, getRedirectRoute } from '@/lib/rbac';
import { getUserRole } from '@/lib/roleCache';
import type { UserRole } from '@/lib/rbac';
import { isVisualEditsMode } from '@/utils/visualEditsDetection';
import { isGuestMode } from '@/hooks/useGuestMode';

import { supabase } from '@/integrations/supabase/client';

const DEBUG_AUTH = process.env.NODE_ENV === 'development';

// Routes that guests can access (browse-only)
const GUEST_ACCESSIBLE_ROUTES = [
  '/dashboard',
  '/swipe',
  '/explore',
  '/community',
  '/community-outfits',
  '/community-clothes',
  '/trending-styles',
  '/featured-brands',
  '/top-influencers',
  '/forum',
  '/p/', // Product detail pages
  '/brand/', // Brand detail pages
];

// Routes that explicitly require authentication (no guest access)
const AUTH_REQUIRED_ROUTES = [
  '/settings',
  '/dress-me',
  '/likes',
  '/wishlist',
  '/cart',
  '/ugc',
  '/events',
  
  '/toy-replica',
  '/affiliate',
  '/brand-portal',
  '/retailer-portal',
];

const isGuestAccessibleRoute = (pathname: string): boolean => {
  return GUEST_ACCESSIBLE_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );
};

const isAuthRequiredRoute = (pathname: string): boolean => {
  return AUTH_REQUIRED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );
};

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

  useEffect(() => {
    // In Visual Edits mode, skip stability delay for immediate response
    if (isVisualEditsMode()) {
      setAuthStable(true);
      return;
    }

    const delay = 50;

    const stabilityTimer = setTimeout(() => {
      setAuthStable(true);
    }, delay);

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

  // Handle guest mode - allow access to browse-only routes
  if (!user && !loading && authStable) {
    const isGuest = isGuestMode();
    
    if (isGuest) {
      // Guest can access browse-only routes
      if (isGuestAccessibleRoute(location.pathname)) {
        if (DEBUG_AUTH) console.log('ProtectedRoute: Guest accessing allowed route:', location.pathname);
        return <>{children}</>;
      }
      
      // Guest trying to access auth-required route - redirect to signup
      if (DEBUG_AUTH) console.log('ProtectedRoute: Guest blocked from:', location.pathname);
      return <Navigate to="/onboarding/signup" state={{ from: location }} replace />;
    }
    
    // No user and not guest - redirect to signup
    if (DEBUG_AUTH) console.log('ProtectedRoute: No user detected, redirecting to signup');
    return <Navigate to="/onboarding/signup" state={{ from: location }} replace />;
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
  if (user && !userRole && !location.pathname.includes('/onboarding')) {
    if (DEBUG_AUTH) console.log('ProtectedRoute: STRICT - User without role, redirecting to signup');
    return <Navigate to="/onboarding/signup" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;