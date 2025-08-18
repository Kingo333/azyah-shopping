// Visual Edits Detection Utility
// Detects when Visual Edits mode is active to provide stable auth experience

export const isVisualEditsMode = (): boolean => {
  // Check for Visual Edits indicators in the DOM or URL
  if (typeof window === 'undefined') return false;
  
  // Check for Visual Edits specific elements or classes
  const hasVisualEditsElements = document.querySelector('[data-visual-edit]') || 
                                 document.querySelector('.visual-edit-mode') ||
                                 document.body.classList.contains('visual-editing');
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hasVisualEditsParam = urlParams.has('visual-edit') || urlParams.has('edit-mode');
  
  // Check for Visual Edits in iframe context
  const isInVisualEditsIframe = window !== window.top && window.location.href.includes('edit');
  
  return Boolean(hasVisualEditsElements || hasVisualEditsParam || isInVisualEditsIframe);
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