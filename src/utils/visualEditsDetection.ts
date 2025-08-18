// Visual Edits Detection Utility
// Detects when Visual Edits mode is active to provide stable auth experience

export const isVisualEditsMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Enhanced Visual Edits detection for Lovable
  
  // 1. Check for Lovable-specific Visual Edits indicators
  const hasLovableElements = document.querySelector('[data-lovable-edit]') || 
                            document.querySelector('.lovable-visual-edit') ||
                            document.querySelector('[data-visual-edit]') || 
                            document.querySelector('.visual-edit-mode') ||
                            document.body.classList.contains('visual-editing');
  
  // 2. Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hasVisualEditsParam = urlParams.has('visual-edit') || 
                             urlParams.has('edit-mode') || 
                             urlParams.has('lovable-edit');
  
  // 3. Enhanced iframe detection for Lovable editor
  let isInLovableEditor = false;
  try {
    // Check if we're in an iframe with Lovable-specific patterns
    isInLovableEditor = window !== window.top && (
      window.location.href.includes('edit') ||
      window.location.href.includes('lovable') ||
      document.referrer.includes('lovable')
    );
  } catch (e) {
    // Cross-origin access error itself indicates iframe context
    isInLovableEditor = window !== window.top;
  }
  
  // 4. Check for Lovable postMessage communication
  const hasLovableMessages = window.addEventListener && 
    (window as any).__lovable_visual_edit_active === true;
  
  return Boolean(hasLovableElements || hasVisualEditsParam || isInLovableEditor || hasLovableMessages);
};

export const onVisualEditsModeChange = (callback: (isActive: boolean) => void) => {
  let currentMode = isVisualEditsMode();
  
  const checkModeChange = () => {
    const newMode = isVisualEditsMode();
    if (newMode !== currentMode) {
      currentMode = newMode;
      callback(newMode);
    }
  };
  
  // Monitor DOM changes
  const observer = new MutationObserver(checkModeChange);
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['class', 'data-visual-edit']
  });
  
  // Monitor URL changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(checkModeChange, 10);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(checkModeChange, 10);
  };
  
  window.addEventListener('popstate', checkModeChange);
  
  return () => {
    observer.disconnect();
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', checkModeChange);
  };
};

// Session storage utilities for Visual Edits compatibility
export const getStableAuthState = () => {
  try {
    const stored = sessionStorage.getItem('stable-auth-state');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setStableAuthState = (user: any, session: any) => {
  try {
    // Extend validity for Visual Edits mode
    const validity = isVisualEditsMode() ? 30 * 60 * 1000 : 10 * 60 * 1000; // 30min vs 10min
    sessionStorage.setItem('stable-auth-state', JSON.stringify({ 
      user, 
      session, 
      timestamp: Date.now(),
      isVisualEdits: isVisualEditsMode(),
      validity 
    }));
  } catch {
    // Ignore storage errors
  }
};

export const clearStableAuthState = () => {
  try {
    sessionStorage.removeItem('stable-auth-state');
  } catch {
    // Ignore storage errors
  }
};