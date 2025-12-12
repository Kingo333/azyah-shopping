import { useState, useEffect, useCallback } from 'react';

const GUEST_MODE_KEY = 'azyah_guest_mode';

export const useGuestMode = () => {
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(GUEST_MODE_KEY) === 'true';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setIsGuest(localStorage.getItem(GUEST_MODE_KEY) === 'true');
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setGuestMode = useCallback(() => {
    localStorage.setItem(GUEST_MODE_KEY, 'true');
    setIsGuest(true);
  }, []);

  const clearGuestMode = useCallback(() => {
    localStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
  }, []);

  return { isGuest, setGuestMode, clearGuestMode };
};

// Helper function to check guest mode without hook (for use outside components)
export const isGuestMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(GUEST_MODE_KEY) === 'true';
};

// Helper function to set guest mode without hook (for use outside components)
export const setGuestMode = () => {
  localStorage.setItem(GUEST_MODE_KEY, 'true');
};

export const clearGuestModeStorage = () => {
  localStorage.removeItem(GUEST_MODE_KEY);
};
