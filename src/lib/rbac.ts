// Role-Based Access Control utilities
import type { User } from '@/types';

export type UserRole = 'shopper' | 'brand' | 'retailer' | 'admin';

// Route access rules
const ROUTE_ACCESS: Record<UserRole, string[]> = {
  shopper: [
    '/', '/dashboard', '/explore', '/swipe', '/feed', '/wishlist', '/cart', 
    '/closets', '/forum', '/ar-tryOn', '/affiliate', '/auth', '/landing', '/settings', '/profile'
  ],
  brand: [
    '/', '/dashboard', '/brand-portal', '/analytics', '/auth', '/landing', '/settings', '/profile'
  ],
  retailer: [
    '/', '/dashboard', '/retailer-portal', '/analytics', '/auth', '/landing', '/settings', '/profile'
  ],
  admin: [
    '/', '/dashboard', '/analytics', '/auth', '/landing', '/brand-portal', 
    '/retailer-portal', '/explore', '/swipe', '/feed', '/wishlist', '/cart', 
    '/closets', '/forum', '/ar-tryOn', '/affiliate', '/settings', '/profile'
  ]
};

// Blocked routes for each role
const BLOCKED_ROUTES: Record<UserRole, string[]> = {
  shopper: ['/brand-portal', '/retailer-portal'],
  brand: ['/retailer-portal', '/swipe', '/feed', '/wishlist', '/closets', '/forum', '/ar-tryOn'],
  retailer: ['/brand-portal', '/swipe', '/feed', '/wishlist', '/closets', '/forum', '/ar-tryOn'],
  admin: []
};

export const canAccessRoute = (userRole: UserRole, route: string): boolean => {
  // Check if route is explicitly blocked
  if (BLOCKED_ROUTES[userRole].some(blocked => route.startsWith(blocked))) {
    return false;
  }
  
  // Check if route is in allowed routes
  return ROUTE_ACCESS[userRole].some(allowed => 
    route === allowed || route.startsWith(allowed)
  );
};

export const getRedirectRoute = (userRole: UserRole): string => {
  switch (userRole) {
    case 'shopper':
      return '/dashboard';
    case 'brand':
      return '/brand-portal';
    case 'retailer':
      return '/retailer-portal';
    case 'admin':
      return '/dashboard';
    default:
      return '/auth';
  }
};

export const isValidRole = (role: string): role is UserRole => {
  return ['shopper', 'brand', 'retailer', 'admin'].includes(role);
};