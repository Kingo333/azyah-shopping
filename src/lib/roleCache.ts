// Role cache utility to optimize ProtectedRoute performance
// Now uses the secure user_roles table as the source of truth
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/lib/rbac';
import { isVisualEditsMode } from '@/utils/visualEditsDetection';

interface CachedRole {
  role: UserRole;
  timestamp: number;
  userId: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'lovable_user_roles';

// Use both memory cache and sessionStorage for persistence across preview refreshes
const roleCache = new Map<string, CachedRole>();

// Load existing cache from sessionStorage on initialization
const loadCacheFromStorage = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([userId, cached]) => {
        roleCache.set(userId, cached as CachedRole);
      });
    }
  } catch (error) {
    console.debug('Failed to load role cache from storage:', error);
  }
};

// Save cache to sessionStorage
const saveCacheToStorage = () => {
  try {
    const data = Object.fromEntries(roleCache.entries());
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.debug('Failed to save role cache to storage:', error);
  }
};

// Initialize cache from storage
loadCacheFromStorage();

export const clearRoleCache = (userId?: string) => {
  if (userId) {
    roleCache.delete(userId);
  } else {
    roleCache.clear();
  }
  saveCacheToStorage();
};

export const getCachedRole = (userId: string): UserRole | null => {
  const cached = roleCache.get(userId);
  if (!cached) return null;
  
  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    roleCache.delete(userId);
    return null;
  }
  
  return cached.role;
};

export const setCachedRole = (userId: string, role: UserRole) => {
  roleCache.set(userId, {
    role,
    timestamp: Date.now(),
    userId
  });
  saveCacheToStorage();
};

export const getUserRole = async (user: any): Promise<UserRole> => {
  if (!user) throw new Error('No user provided');
  
  const userId = user.id;
  
  // In Visual Edits mode, prioritize metadata for stability
  if (isVisualEditsMode()) {
    const metadataRole = user.user_metadata?.role;
    if (metadataRole && ['shopper', 'brand', 'retailer'].includes(metadataRole)) {
      setCachedRole(userId, metadataRole as UserRole);
      return metadataRole as UserRole;
    }
  }
  
  // 1. Check cache first
  const cachedRole = getCachedRole(userId);
  if (cachedRole) {
    return cachedRole;
  }
  
  // 2. Query the secure user_roles table (source of truth)
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('role', { ascending: true }) // admin comes first if multiple
      .limit(1)
      .single();
      
    if (!error && data) {
      const dbRole = data.role as UserRole;
      setCachedRole(userId, dbRole);
      return dbRole;
    }
  } catch (dbError) {
    console.warn('Failed to fetch role from user_roles:', dbError);
  }
  
  // 3. Fallback to user_metadata (for new signups before trigger runs)
  const metadataRole = user.user_metadata?.role;
  if (metadataRole && ['shopper', 'brand', 'retailer'].includes(metadataRole)) {
    setCachedRole(userId, metadataRole as UserRole);
    return metadataRole as UserRole;
  }
  
  // 4. Final fallback to public.users table (legacy)
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (!error && data?.role) {
      const legacyRole = data.role as UserRole;
      setCachedRole(userId, legacyRole);
      return legacyRole;
    }
  } catch (legacyError) {
    console.warn('Legacy role lookup failed:', legacyError);
  }
  
  // 5. Default to shopper if no role found anywhere
  console.warn('No role found for user, defaulting to shopper');
  const defaultRole: UserRole = 'shopper';
  setCachedRole(userId, defaultRole);
  return defaultRole;
};
