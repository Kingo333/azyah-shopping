import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

export type QuickActionKey = 'dashboard' | 'shop' | 'ai' | 'beauty' | 'feed' | 'wishlist' | 'explore' | 'ugc' | 'toy';

export const useQuickActionsSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<QuickActionKey>('dashboard');

  // Read section from URL on mount and URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const section = searchParams.get('section') as QuickActionKey;
    
    if (section && ['dashboard', 'shop', 'ai', 'beauty', 'feed', 'wishlist', 'explore', 'ugc', 'toy'].includes(section)) {
      setSelectedSection(section);
    } else {
      setSelectedSection('dashboard');
    }
  }, [location.search]);

  // Update URL when selection changes
  const updateSection = useCallback((section: QuickActionKey) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('section', section);
    
    // Use replace to avoid cluttering browser history
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    setSelectedSection(section);
  }, [location.pathname, location.search, navigate]);

  return {
    selectedSection,
    updateSection
  };
};