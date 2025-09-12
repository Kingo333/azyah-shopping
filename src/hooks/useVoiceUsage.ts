import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface VoiceUsage {
  remaining_seconds: number;
  daily_limit: number;
  used_today: number;
  is_premium: boolean;
}

export function useVoiceUsage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<VoiceUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    if (!user) {
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_voice_usage_today', { target_user_id: user.id });

      if (error) {
        console.error('Error fetching voice usage:', error);
        return;
      }

      if (data && data.length > 0) {
        setUsage({
          remaining_seconds: data[0].remaining_seconds,
          daily_limit: data[0].daily_limit,
          used_today: data[0].used_today,
          is_premium: data[0].is_premium
        });
      }
    } catch (error) {
      console.error('Error fetching voice usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const logUsage = async (seconds: number) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('log_voice_usage', { 
          target_user_id: user.id,
          seconds_used: seconds
        });

      if (error) {
        console.error('Error logging voice usage:', error);
        return false;
      }

      // Refresh usage after logging
      await fetchUsage();
      return true;
    } catch (error) {
      console.error('Error logging voice usage:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [user]);

  return {
    usage,
    loading,
    refetch: fetchUsage,
    logUsage
  };
}