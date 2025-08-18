// Session utilities for handling preview environment persistence
export const isPreviewEnvironment = () => {
  return window.location.hostname.includes('lovable') || 
         window.location.hostname.includes('preview');
};

export const storeSessionBackup = (user: any, session: any) => {
  if (isPreviewEnvironment()) {
    try {
      localStorage.setItem('azyah-user-backup', JSON.stringify(user));
      localStorage.setItem('azyah-session-backup', JSON.stringify(session));
      localStorage.setItem('azyah-session-timestamp', Date.now().toString());
    } catch (error) {
      console.warn('Failed to store session backup:', error);
    }
  }
};

export const getSessionBackup = () => {
  if (!isPreviewEnvironment()) return null;
  
  try {
    const user = localStorage.getItem('azyah-user-backup');
    const session = localStorage.getItem('azyah-session-backup');
    const timestamp = localStorage.getItem('azyah-session-timestamp');
    
    // Only use backup if it's less than 5 minutes old
    if (user && session && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 5 * 60 * 1000) { // 5 minutes
        return {
          user: JSON.parse(user),
          session: JSON.parse(session)
        };
      }
    }
  } catch (error) {
    console.warn('Failed to get session backup:', error);
  }
  
  return null;
};

export const clearSessionBackup = () => {
  localStorage.removeItem('azyah-user-backup');
  localStorage.removeItem('azyah-session-backup');
  localStorage.removeItem('azyah-session-timestamp');
};

export const isLikelyPreviewRefresh = (): boolean => {
  // Check if we're in preview environment and have recent session backup
  if (!isPreviewEnvironment()) return false;
  
  const timestamp = localStorage.getItem('azyah-session-timestamp');
  if (!timestamp) return false;
  
  const age = Date.now() - parseInt(timestamp);
  return age < 30 * 1000; // Within last 30 seconds
};