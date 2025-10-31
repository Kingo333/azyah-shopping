import { supabase } from '@/integrations/supabase/client';

const APP_VERSION_KEY = 'azyah_app_version';
const SESSION_HEALTH_KEY = 'azyah_session_health';
const CURRENT_APP_VERSION = '1.0.0'; // Increment this after major deployments

interface SessionHealth {
  lastCheck: number;
  version: string;
  isValid: boolean;
}

export const clearAllAuthData = () => {
  try {
    console.log('Clearing all auth data...');
    
    // Clear all possible auth-related localStorage keys
    const keysToRemove = [
      'sb-klwolsopucgswhtdlsps-auth-token',
      'azyah_payment_session_backup',
      'azyah_payment_flow_active',
      SESSION_HEALTH_KEY,
      APP_VERSION_KEY
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear any cached role data
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const roleCache = sessionStorage.getItem('azyah_role_cache');
      if (roleCache) {
        sessionStorage.removeItem('azyah_role_cache');
      }
    }
    
    console.log('All auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const checkVersionMismatch = (): boolean => {
  try {
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    if (!storedVersion || storedVersion !== CURRENT_APP_VERSION) {
      console.log('Version mismatch detected. Stored:', storedVersion, 'Current:', CURRENT_APP_VERSION);
      localStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking version:', error);
    return true; // Assume mismatch on error to be safe
  }
};

export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('Session validation error:', error);
      return false;
    }
    
    if (!session) {
      console.log('No session found');
      return false;
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired');
      return false;
    }
    
    // Try to refresh the session if it's close to expiring
    if (session.expires_at && session.expires_at - now < 300) { // 5 minutes
      console.log('Refreshing session...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log('Session refresh failed:', refreshError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
};

export const performSessionHealthCheck = async (): Promise<boolean> => {
  console.log('Performing session health check...');
  
  // Check for version mismatch first
  if (checkVersionMismatch()) {
    console.log('Version mismatch - clearing auth data');
    clearAllAuthData();
    return false;
  }
  
  // Validate current session
  const isValid = await validateSession();
  
  // Store health check result
  const healthData: SessionHealth = {
    lastCheck: Date.now(),
    version: CURRENT_APP_VERSION,
    isValid
  };
  
  try {
    localStorage.setItem(SESSION_HEALTH_KEY, JSON.stringify(healthData));
  } catch (error) {
    console.error('Failed to store session health:', error);
  }
  
  if (!isValid) {
    console.log('Session invalid - clearing auth data');
    clearAllAuthData();
  }
  
  return isValid;
};

export const shouldPerformHealthCheck = (): boolean => {
  try {
    const stored = localStorage.getItem(SESSION_HEALTH_KEY);
    if (!stored) return true;
    
    const health: SessionHealth = JSON.parse(stored);
    const timeSinceCheck = Date.now() - health.lastCheck;
    
    // Perform check if:
    // - More than 5 minutes since last check
    // - Version mismatch
    // - Last check indicated invalid session
    return (
      timeSinceCheck > 5 * 60 * 1000 || 
      health.version !== CURRENT_APP_VERSION ||
      !health.isValid
    );
  } catch (error) {
    console.error('Error checking health status:', error);
    return true;
  }
};

export const recoverFromAuthError = async (): Promise<void> => {
  console.log('Attempting auth error recovery...');
  
  try {
    // Force sign out
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    console.log('Local signout failed, continuing with cleanup:', error);
  }
  
  // Clear all auth data
  clearAllAuthData();
  
  // Redirect to intro carousel with recovery flag
  const currentPath = window.location.pathname;
  if (currentPath !== '/') {
    sessionStorage.setItem('auth_recovery_redirect', currentPath);
    window.location.href = '/?recovery=true';
  }
};