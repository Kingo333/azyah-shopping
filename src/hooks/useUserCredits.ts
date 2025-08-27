import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserCredits {
  credits_remaining: number;
  is_premium: boolean;
}

export function useUserCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_user_credits', { target_user_id: user.id });

      if (error) {
        console.error('Error fetching credits:', error);
        return;
      }

      if (data && data.length > 0) {
        setCredits({
          credits_remaining: data[0].credits_remaining,
          is_premium: data[0].is_premium
        });
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  const updateCredits = (newCredits: UserCredits) => {
    setCredits(newCredits);
  };

  return {
    credits,
    loading,
    refetch: fetchCredits,
    updateCredits
  };
}