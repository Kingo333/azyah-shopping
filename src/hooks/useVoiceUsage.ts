import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface VoiceUsage {
  remaining_seconds: number;
  total_limit: number;
  used_today: number;
  plan_type: 'free' | 'premium';
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
          total_limit: data[0].total_limit,
          used_today: data[0].used_today,
          plan_type: data[0].plan_type as 'free' | 'premium',
          is_premium: data[0].is_premium
        });
      }
    } catch (error) {
      console.error('Error fetching voice usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUsage = async (inputSeconds: number = 0, outputSeconds: number = 0) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('update_voice_usage', { 
          target_user_id: user.id,
          input_secs: inputSeconds,
          output_secs: outputSeconds
        });

      if (error) {
        console.error('Error updating voice usage:', error);
        return false;
      }

      // Refresh usage after update
      await fetchUsage();
      return true;
    } catch (error) {
      console.error('Error updating voice usage:', error);
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
    updateUsage
  };
}