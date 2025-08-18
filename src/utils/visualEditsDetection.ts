// Visual Edits Detection Utility
// Detects when Visual Edits mode is active to provide stable auth experience

export const isVisualEditsMode = (): boolean => {
  // Check for Visual Edits indicators in the DOM or URL
  if (typeof window === 'undefined') return false;
  
  // Check for Lovable Visual Edits specific indicators
  const hasVisualEditsElements = document.querySelector('[data-visual-edit]') || 
                                 document.querySelector('.visual-edit-mode') ||
                                 document.body.classList.contains('visual-editing') ||
                                 document.querySelector('[data-lovable-edit]') ||
                                 document.querySelector('.lovable-editor');
  
  // Check URL parameters for Visual Edits
  const urlParams = new URLSearchParams(window.location.search);
  const hasVisualEditsParam = urlParams.has('visual-edit') || 
                              urlParams.has('edit-mode') ||
                              urlParams.has('lovable-edit') ||
                              window.location.href.includes('preview--');
  
  // Enhanced iframe detection for Lovable Visual Edits
  const isInLovableIframe = window !== window.top && 
                           (window.location.href.includes('preview--') ||
                            window.location.href.includes('lovable.app'));
  
  // Check for parent communication (Lovable editor context) - safely handle cross-origin
  let hasParentEditor = false;
  try {
    // Only attempt parent access if we're in an iframe
    if (window !== window.top && window.parent) {
      // Try to access parent location - this will throw if cross-origin
      const parentOrigin = window.parent.location.origin;
      hasParentEditor = window.location.origin !== parentOrigin;
    }
  } catch (error) {
    // Cross-origin access blocked - this actually indicates we're in Visual Edits iframe
    hasParentEditor = window !== window.top;
  }
  
  return Boolean(hasVisualEditsElements || hasVisualEditsParam || isInLovableIframe || hasParentEditor);
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
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    const isExpired = Date.now() - parsed.timestamp > (isVisualEditsMode() ? 30 * 60 * 1000 : 10 * 60 * 1000); // 30min for Visual Edits, 10min otherwise
    
    return isExpired ? null : parsed;
  } catch {
    return null;
  }
};

export const setStableAuthState = (user: any, session: any) => {
  try {
    sessionStorage.setItem('stable-auth-state', JSON.stringify({ user, session, timestamp: Date.now() }));
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