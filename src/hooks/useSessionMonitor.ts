import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { performSessionHealthCheck, recoverFromAuthError } from '@/utils/sessionHealthCheck';

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

    // Start monitoring
    const startMonitoring = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(async () => {
        const now = Date.now();
        
        // Avoid too frequent checks
        if (now - lastCheckRef.current < 60000) { // 1 minute minimum
          return;
        }
        
        lastCheckRef.current = now;
        
        try {
          const isHealthy = await performSessionHealthCheck();
          
          if (!isHealthy) {
            console.log('Session monitor detected unhealthy session');
            await recoverFromAuthError();
          }
        } catch (error) {
          console.error('Session monitor error:', error);
          // Don't recover on every error, just log it
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
    };

    startMonitoring();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, user]);

  // Handle visibility change to check session when user returns
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session && user) {
        const now = Date.now();
        
        // Only check if it's been more than 2 minutes since last check
        if (now - lastCheckRef.current > 2 * 60 * 1000) {
          lastCheckRef.current = now;
          
          try {
            const isHealthy = await performSessionHealthCheck();
            
            if (!isHealthy) {
              console.log('Session unhealthy on visibility change');
              await recoverFromAuthError();
            }
          } catch (error) {
            console.error('Visibility change session check error:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, user]);
};