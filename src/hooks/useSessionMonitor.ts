import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isCapacitorApp } from '@/utils/sessionHealthCheck';

export const useSessionMonitor = () => {
  const { session, user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    // Only monitor if user is authenticated
    if (!session || !user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Simple periodic session refresh - let Supabase handle the heavy lifting
    const startMonitoring = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Check less frequently - every 15 minutes instead of 5
      // Supabase's autoRefreshToken handles most cases
      const checkInterval = isCapacitorApp() ? 20 * 60 * 1000 : 15 * 60 * 1000;

      intervalRef.current = setInterval(async () => {
        const now = Date.now();
        
        // Avoid too frequent checks - 5 minute minimum
        if (now - lastCheckRef.current < 5 * 60 * 1000) {
          return;
        }
        
        lastCheckRef.current = now;
        
        try {
          // Just silently refresh the session - don't trigger recovery
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            const expiresAt = currentSession.expires_at || 0;
            const nowSeconds = Math.floor(Date.now() / 1000);
            
            // Proactively refresh if expiring within 10 minutes
            if (expiresAt - nowSeconds < 600) {
              console.log('Session monitor: Proactively refreshing session');
              await supabase.auth.refreshSession();
            }
          }
        } catch (error) {
          // Log but don't take action - network errors shouldn't trigger logout
          console.log('Session monitor: Check failed (network?):', error);
        }
      }, checkInterval);
    };

    startMonitoring();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, user]);

  // Handle visibility change - be lenient, just refresh silently
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session && user) {
        const now = Date.now();
        
        // On mobile/Capacitor, be more lenient - wait 5 minutes
        // On web, 2 minutes is fine
        const minInterval = isCapacitorApp() ? 5 * 60 * 1000 : 2 * 60 * 1000;
        
        if (now - lastCheckRef.current > minInterval) {
          lastCheckRef.current = now;
          
          // Small delay to let the app fully resume
          setTimeout(async () => {
            try {
              // Just refresh silently - don't check validity or trigger recovery
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              
              if (currentSession) {
                const expiresAt = currentSession.expires_at || 0;
                const nowSeconds = Math.floor(Date.now() / 1000);
                
                // Refresh if expiring within 10 minutes
                if (expiresAt - nowSeconds < 600) {
                  console.log('Visibility change: Refreshing session');
                  await supabase.auth.refreshSession();
                }
              }
            } catch (error) {
              // Network error on resume - ignore, don't logout
              console.log('Visibility change: Refresh failed (expected on resume)');
            }
          }, isCapacitorApp() ? 1000 : 500); // Longer delay on mobile
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, user]);
};
