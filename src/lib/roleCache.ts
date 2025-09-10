// Role cache utility to optimize ProtectedRoute performance
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
    if (metadataRole && ['shopper', 'brand', 'retailer'].includes(metadataRole)) { // Admin excluded
      setCachedRole(userId, metadataRole as UserRole);
      return metadataRole as UserRole;
    }
  }
  
  // 1. Check cache first
  const cachedRole = getCachedRole(userId);
  if (cachedRole) {
    return cachedRole;
  }
  
  // 2. STRICT: Use user_metadata.role as SINGLE source of truth (set during signup)
  const metadataRole = user.user_metadata?.role;
  if (metadataRole && ['shopper', 'brand', 'retailer'].includes(metadataRole)) { // Admin excluded
    setCachedRole(userId, metadataRole as UserRole);
    
    // Sync with database in background (don't wait)
    setTimeout(() => {
      const syncRole = async () => {
        try {
          await supabase
            .from('users')
            .upsert({ 
              id: userId,
              email: user.email,
              role: metadataRole as UserRole,
              updated_at: new Date().toISOString()
            });
          console.log('Role synced to database');
        } catch (err) {
          console.warn('Role sync failed:', err);
        }
      };
      syncRole();
    }, 0);
    
    return metadataRole as UserRole;
  }
  
  // 3. Fallback to database only if metadata is missing
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (error || !data) {
      // STRICT: No fallback role - user must have a role
      throw new Error('User role not found in database');
    }
    
    const dbRole = data.role as UserRole;
    setCachedRole(userId, dbRole);
    return dbRole;
    
  } catch (dbError) {
    // STRICT: Only fallback to shopper for new users
    console.warn('Database role query failed:', dbError);
    const defaultRole: UserRole = 'shopper';
    setCachedRole(userId, defaultRole);
    return defaultRole;
  }
};