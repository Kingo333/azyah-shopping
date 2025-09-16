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
    
    // Only update if it's a valid section and different from current
    if (section && ['dashboard', 'shop', 'ai', 'beauty', 'feed', 'wishlist', 'explore', 'ugc', 'toy'].includes(section)) {
      if (section !== selectedSection) {
        setSelectedSection(section);
      }
    } else if (!section && selectedSection !== 'dashboard') {
      // Only default to dashboard if no section param exists and we're not already on dashboard
      setSelectedSection('dashboard');
    }
  }, [location.search, selectedSection]);

  // Update URL when selection changes
  const updateSection = useCallback((section: QuickActionKey) => {
    if (section === selectedSection) return; // Prevent unnecessary updates
    
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('section', section);
    
    // Use replace to avoid cluttering browser history
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    setSelectedSection(section);
  }, [location.pathname, location.search, navigate, selectedSection]);

  return {
    selectedSection,
    updateSection
  };
};