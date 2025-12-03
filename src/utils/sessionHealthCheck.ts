import { supabase } from '@/integrations/supabase/client';

const APP_VERSION_KEY = 'azyah_app_version';
const SESSION_HEALTH_KEY = 'azyah_session_health';
const RECOVERY_COOLDOWN_KEY = 'azyah_recovery_cooldown';
const CURRENT_APP_VERSION = '1.0.1'; // Increment after major deployments

interface SessionHealth {
  lastCheck: number;
  version: string;
  isValid: boolean;
  consecutiveFailures: number;
}

// Recovery cooldown - prevent multiple recoveries within this time
const RECOVERY_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_CONSECUTIVE_FAILURES = 3;

// Detect if running in Capacitor/native app
export const isCapacitorApp = (): boolean => {
  return typeof window !== 'undefined' && 
    (window as any).Capacitor !== undefined;
};

export const clearAllAuthData = () => {
  try {
    console.log('Clearing all auth data...');
    
    // Clear all possible auth-related localStorage keys
    const keysToRemove = [
      'sb-klwolsopucgswhtdlsps-auth-token',
      'azyah_payment_session_backup',
      'azyah_payment_flow_active',
      SESSION_HEALTH_KEY,
      RECOVERY_COOLDOWN_KEY
      // Don't clear APP_VERSION_KEY - it's just for tracking
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore storage errors
      }
    });
    
    // Clear any cached role data
    try {
      sessionStorage.removeItem('azyah_role_cache');
    } catch (e) {
      // Ignore
    }
    
    console.log('Auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Just updates version tracking - no longer triggers auth clearing
export const checkVersionMismatch = (): boolean => {
  try {
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    if (!storedVersion || storedVersion !== CURRENT_APP_VERSION) {
      console.log('Version updated. Stored:', storedVersion, 'Current:', CURRENT_APP_VERSION);
      localStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
      return true; // Version changed, but don't clear auth
    }
    return false;
  } catch (error) {
    console.error('Error checking version:', error);
    return false;
  }
};

export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('Session validation error:', error.message);
      // Only return false for actual errors, not just missing sessions
      if (error.message.includes('refresh_token') || 
          error.message.includes('invalid') ||
          error.message.includes('expired')) {
        return false;
      }
      // For other errors (network, etc.), don't assume invalid
      return true;
    }
    
    // No session is valid state for unauthenticated users
    if (!session) {
      console.log('No session - user not authenticated (valid state)');
      return true;
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired, attempting refresh...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log('Session refresh failed:', refreshError.message);
        return false;
      }
      console.log('Session refreshed successfully');
    }
    
    // Try to refresh proactively if close to expiring (5 minutes)
    if (session.expires_at && session.expires_at - now < 300) {
      console.log('Session expiring soon, refreshing...');
      await supabase.auth.refreshSession();
    }
    
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    // On network errors, assume session is valid to prevent false logouts
    return true;
  }
};

export const performSessionHealthCheck = async (): Promise<boolean> => {
  console.log('Performing session health check...');
  
  // Check version (informational only, doesn't affect auth)
  checkVersionMismatch();
  
  // Validate current session
  const isValid = await validateSession();
  
  // Get current health data
  let currentHealth: SessionHealth = {
    lastCheck: Date.now(),
    version: CURRENT_APP_VERSION,
    isValid,
    consecutiveFailures: 0
  };
  
  try {
    const stored = localStorage.getItem(SESSION_HEALTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      currentHealth.consecutiveFailures = parsed.consecutiveFailures || 0;
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  // Update consecutive failures
  if (!isValid) {
    currentHealth.consecutiveFailures++;
    console.log(`Session check failed. Consecutive failures: ${currentHealth.consecutiveFailures}`);
  } else {
    currentHealth.consecutiveFailures = 0;
  }
  
  // Store health check result
  try {
    localStorage.setItem(SESSION_HEALTH_KEY, JSON.stringify(currentHealth));
  } catch (error) {
    console.error('Failed to store session health:', error);
  }
  
  // Only consider truly unhealthy after multiple consecutive failures
  if (currentHealth.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    console.log('Multiple consecutive failures - session may be invalid');
    return false;
  }
  
  return true;
};

export const shouldPerformHealthCheck = (): boolean => {
  try {
    const stored = localStorage.getItem(SESSION_HEALTH_KEY);
    if (!stored) return true;
    
    const health: SessionHealth = JSON.parse(stored);
    const timeSinceCheck = Date.now() - health.lastCheck;
    
    // Perform check if more than 10 minutes since last check (increased from 5)
    // or if there were recent failures
    return (
      timeSinceCheck > 10 * 60 * 1000 || 
      health.consecutiveFailures > 0
    );
  } catch (error) {
    console.error('Error checking health status:', error);
    return true;
  }
};

// Check if recovery is on cooldown
const isRecoveryOnCooldown = (): boolean => {
  try {
    const lastRecovery = localStorage.getItem(RECOVERY_COOLDOWN_KEY);
    if (!lastRecovery) return false;
    
    const timeSince = Date.now() - parseInt(lastRecovery, 10);
    return timeSince < RECOVERY_COOLDOWN_MS;
  } catch (e) {
    return false;
  }
};

// Callback for soft navigation - set by App component
let navigationCallback: ((path: string) => void) | null = null;

export const setNavigationCallback = (callback: (path: string) => void) => {
  navigationCallback = callback;
};

export const recoverFromAuthError = async (): Promise<void> => {
  // Check cooldown to prevent rapid recovery loops
  if (isRecoveryOnCooldown()) {
    console.log('Recovery on cooldown, skipping...');
    return;
  }
  
  console.log('Attempting auth error recovery...');
  
  // Set cooldown
  try {
    localStorage.setItem(RECOVERY_COOLDOWN_KEY, Date.now().toString());
  } catch (e) {
    // Ignore
  }
  
  try {
    // Force sign out
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    console.log('Local signout failed, continuing with cleanup:', error);
  }
  
  // Clear all auth data
  clearAllAuthData();
  
  // Use soft navigation if available, otherwise fall back to hard redirect
  const currentPath = window.location.pathname;
  if (currentPath !== '/') {
    sessionStorage.setItem('auth_recovery_redirect', currentPath);
    
    if (navigationCallback) {
      console.log('Using soft navigation for recovery');
      navigationCallback('/');
    } else {
      // Fallback to hard redirect only if no navigation callback
      console.log('No navigation callback, using hard redirect');
      window.location.href = '/?recovery=true';
    }
  }
};
