import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setNavigationCallback } from '@/utils/sessionHealthCheck';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to set up soft navigation for auth recovery
 * This should be used in App.tsx inside the Router context
 */
export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    // Set up navigation callback for auth recovery
    setNavigationCallback((path: string) => {
      console.log('Auth recovery: Navigating to', path);
      navigate(path, { replace: true });
    });

    // Set up signout navigation callback
    if (auth) {
      auth.onSignOutComplete = () => {
        console.log('SignOut complete: Navigating to landing');
        navigate('/', { replace: true });
      };
    }

    return () => {
      setNavigationCallback(() => {});
      if (auth) {
        auth.onSignOutComplete = undefined;
      }
    };
  }, [navigate, auth]);
};
