// Role-Based Access Control utilities
import type { User } from '@/types';

export type UserRole = 'shopper' | 'brand' | 'retailer' | 'admin'; // admin is system-only, not user-assignable

// Route access rules
const ROUTE_ACCESS: Record<Exclude<UserRole, 'admin'>, string[]> = {
  shopper: [
    '/', '/dashboard', '/explore', '/swipe', '/feed', '/wishlist', '/cart', 
    '/closets', '/forum', '/ar-tryOn', '/affiliate', '/auth', '/landing', '/settings', '/profile'
  ],
  brand: [
    '/', '/dashboard', '/brand-portal', '/auth', '/landing', '/settings', '/profile'
  ],
  retailer: [
    '/', '/dashboard', '/retailer-portal', '/auth', '/landing', '/settings', '/profile'
  ]
};

// Blocked routes for each role
const BLOCKED_ROUTES: Record<Exclude<UserRole, 'admin'>, string[]> = {
  shopper: ['/brand-portal', '/retailer-portal'],
  brand: ['/retailer-portal', '/swipe', '/feed', '/wishlist', '/closets', '/forum', '/ar-tryOn'],
  retailer: ['/brand-portal', '/swipe', '/feed', '/wishlist', '/closets', '/forum', '/ar-tryOn']
};

export const canAccessRoute = (userRole: UserRole, route: string): boolean => {
  // Admin role is system-only, should not be used for route access
  if (userRole === 'admin') {
    return false;
  }
  
  const role = userRole as Exclude<UserRole, 'admin'>;
  
  // Check if route is explicitly blocked
  if (BLOCKED_ROUTES[role].some(blocked => route.startsWith(blocked))) {
    return false;
  }
  
  // Check if route is in allowed routes
  return ROUTE_ACCESS[role].some(allowed => 
    route === allowed || route.startsWith(allowed)
  );
};

export const getRedirectRoute = (userRole: UserRole): string => {
  switch (userRole) {
    case 'shopper':
      return '/swipe'; // Shoppers land on Feed after login
    case 'brand':
      return '/brand-portal';
    case 'retailer':
      return '/retailer-portal';
    case 'admin':
      return '/auth'; // Admin users should not access frontend
    default:
      return '/auth';
  }
};

export const isValidRole = (role: string): role is UserRole => {
  return ['shopper', 'brand', 'retailer'].includes(role); // Admin excluded from user validation
};