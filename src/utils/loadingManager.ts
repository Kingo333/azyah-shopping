// Loading state manager for Visual Edits compatibility
let loadingTimeouts: Set<NodeJS.Timeout> = new Set();
let isVisualEditsMode = false;

// Visual Edits detection
export const detectVisualEdits = (): boolean => {
  // Check for Visual Edits specific indicators
  const hasVisualEditsParams = window.location.search.includes('visual-edit') || 
    window.location.search.includes('edit-mode');
  const hasVisualEditsClass = document.body.classList.contains('visual-edits-active');
  const hasEditingInterface = document.querySelector('[data-visual-edits]');
  
  return hasVisualEditsParams || hasVisualEditsClass || !!hasEditingInterface;
};

export const setVisualEditsMode = (enabled: boolean) => {
  isVisualEditsMode = enabled;
  if (enabled) {
    // Force clear all loading states when entering Visual Edits
    clearAllLoadingStates();
  }
};

export const isInVisualEditsMode = (): boolean => {
  return isVisualEditsMode || detectVisualEdits();
};

// Centralized timeout management
export const createManagedTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
  // In Visual Edits mode, resolve immediately or with minimal delay
  const actualDelay = isInVisualEditsMode() ? Math.min(delay, 100) : delay;
  
  const timeout = setTimeout(() => {
    loadingTimeouts.delete(timeout);
    callback();
  }, actualDelay);
  
  loadingTimeouts.add(timeout);
  return timeout;
};

export const clearManagedTimeout = (timeout: NodeJS.Timeout) => {
  clearTimeout(timeout);
  loadingTimeouts.delete(timeout);
};

// Emergency cleanup
export const clearAllLoadingStates = () => {
  loadingTimeouts.forEach(timeout => clearTimeout(timeout));
  loadingTimeouts.clear();
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('azyah-force-loading-clear'));
};

// Global failsafe - automatically clear stuck loading after 3 seconds
export const initLoadingFailsafe = () => {
  const failsafeTimeout = setTimeout(() => {
    console.warn('Loading failsafe triggered - clearing all loading states');
    clearAllLoadingStates();
  }, 3000);
  
  // Clear failsafe if page loads normally
  window.addEventListener('load', () => {
    clearTimeout(failsafeTimeout);
  });
  
  // Clear failsafe when user interacts
  const clearFailsafe = () => {
    clearTimeout(failsafeTimeout);
    document.removeEventListener('click', clearFailsafe);
    document.removeEventListener('scroll', clearFailsafe);
  };
  
  document.addEventListener('click', clearFailsafe);
  document.addEventListener('scroll', clearFailsafe);
};

// Auto-detect Visual Edits mode changes
export const initVisualEditsDetection = () => {
  // Watch for URL changes
  const checkVisualEdits = () => {
    const newMode = detectVisualEdits();
    if (newMode !== isVisualEditsMode) {
      setVisualEditsMode(newMode);
    }
  };
  
  // Check on navigation
  window.addEventListener('popstate', checkVisualEdits);
  window.addEventListener('pushstate', checkVisualEdits);
  
  // Check on DOM changes (for dynamic Visual Edits injection)
  const observer = new MutationObserver(checkVisualEdits);
  observer.observe(document.body, { 
    attributes: true, 
    attributeFilter: ['class', 'data-visual-edits'] 
  });
  
  // Initial check
  checkVisualEdits();
  
  return () => {
    window.removeEventListener('popstate', checkVisualEdits);
    window.removeEventListener('pushstate', checkVisualEdits);
    observer.disconnect();
  };
};