// Role cache utility to optimize ProtectedRoute performance
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/lib/rbac';

interface CachedRole {
  role: UserRole;
  timestamp: number;
  userId: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const roleCache = new Map<string, CachedRole>();

export const clearRoleCache = (userId?: string) => {
  if (userId) {
    roleCache.delete(userId);
  } else {
    roleCache.clear();
  }
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
};

export const getUserRole = async (user: any): Promise<UserRole> => {
  if (!user) throw new Error('No user provided');
  
  const userId = user.id;
  
  // 1. Check cache first
  const cachedRole = getCachedRole(userId);
  if (cachedRole) {
    console.log('RoleCache: Using cached role:', cachedRole, 'for user:', user.email);
    return cachedRole;
  }
  
  // 2. Use user_metadata.role as primary source (set during signup)
  const metadataRole = user.user_metadata?.role;
  if (metadataRole && ['shopper', 'brand', 'retailer', 'admin'].includes(metadataRole)) {
    console.log('RoleCache: Using metadata role:', metadataRole, 'for user:', user.email);
    setCachedRole(userId, metadataRole as UserRole);
    return metadataRole as UserRole;
  }
  
  // 3. Fallback to database query with retry logic
  let retries = 2;
  while (retries > 0) {
    try {
      console.log('RoleCache: Fetching role from database for user:', user.email, 'retries left:', retries);
      
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('RoleCache: Database error:', error);
        retries--;
        if (retries === 0) {
          // Final fallback to default role
          console.log('RoleCache: Using default fallback role for user:', user.email);
          const defaultRole: UserRole = 'shopper';
          setCachedRole(userId, defaultRole);
          return defaultRole;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      const dbRole = data.role as UserRole;
      console.log('RoleCache: Database role fetched:', dbRole, 'for user:', user.email);
      setCachedRole(userId, dbRole);
      return dbRole;
      
    } catch (dbError) {
      console.error('RoleCache: Database query failed:', dbError);
      retries--;
      if (retries === 0) {
        // Final fallback
        const defaultRole: UserRole = 'shopper';
        setCachedRole(userId, defaultRole);
        return defaultRole;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  const defaultRole: UserRole = 'shopper';
  setCachedRole(userId, defaultRole);
  return defaultRole;
};

// Clear cache when user signs out
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    roleCache.clear();
    console.log('RoleCache: Cleared cache on sign out');
  }
});