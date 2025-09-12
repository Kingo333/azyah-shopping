import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

interface VoiceUsage {
  used_today: number;
  daily_limit: number;
  remaining_seconds: number;
  is_premium: boolean;
}

interface UseVoiceUsageReturn {
  usage: VoiceUsage | null;
  loading: boolean;
  error: string | null;
  canStartSession: boolean;
  logUsage: (seconds: number) => Promise<void>;
  refreshUsage: () => Promise<void>;
  getLimitWarning: () => string | null;
}

export function useVoiceUsage(): UseVoiceUsageReturn {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [usage, setUsage] = useState<VoiceUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getStorageKey = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return `voice_usage_${user?.id}_${today}`;
  }, [user]);

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Get usage from localStorage for today
      const storageKey = getStorageKey();
      const storedUsage = localStorage.getItem(storageKey);
      const used_today = storedUsage ? parseInt(storedUsage, 10) : 0;
      
      // Set limits based on premium status
      const daily_limit = isPremium ? 300 : 120; // 5 minutes vs 2 minutes
      const remaining_seconds = Math.max(0, daily_limit - used_today);

      setUsage({
        used_today,
        daily_limit,
        remaining_seconds,
        is_premium: isPremium
      });
    } catch (err) {
      console.error('Unexpected error fetching voice usage:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, isPremium, getStorageKey]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, isPremium]); // Refetch when premium status changes

  const logUsage = useCallback(async (seconds: number) => {
    if (!user || seconds <= 0) return;

    try {
      const roundedSeconds = Math.round(seconds);
      
      // Update localStorage
      const storageKey = getStorageKey();
      const currentUsage = parseInt(localStorage.getItem(storageKey) || '0', 10);
      const newUsage = currentUsage + roundedSeconds;
      localStorage.setItem(storageKey, newUsage.toString());
      
      // Refresh usage display
      await fetchUsage();
      
      console.log(`Voice usage logged: ${roundedSeconds}s (total today: ${newUsage}s)`);
    } catch (err) {
      console.error('Unexpected error logging voice usage:', err);
    }
  }, [user, fetchUsage, getStorageKey]);

  const canStartSession = !usage || usage.remaining_seconds > 0;

  const getLimitWarning = useCallback(() => {
    if (!usage) return null;
    
    const remaining = usage.remaining_seconds;
    if (remaining <= 0) {
      return isPremium 
        ? 'Daily voice limit reached (5 minutes)'
        : 'Daily voice limit reached (2 minutes). Upgrade to Premium for more!';
    }
    
    if (remaining <= 30) {
      return `Only ${remaining}s of voice time remaining today`;
    }
    
    if (remaining <= 60 && !isPremium) {
      return `${remaining}s remaining today. Upgrade to Premium for 5 minutes daily!`;
    }
    
    return null;
  }, [usage, isPremium]);

  return {
    usage,
    loading,
    error,
    canStartSession,
    logUsage,
    refreshUsage: fetchUsage,
    getLimitWarning
  };
}