/**
 * Hook to fetch and manage user's points balance
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PointsActivity {
  action_type: string;
  amount: number;
  type: 'earn' | 'spend';
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface UserPointsData {
  balance: number;
  earned_total: number;
  spent_total: number;
  today_earned: number;
  today_cap: number;
  recent_activity: PointsActivity[];
}

interface UserPointsResult {
  success: boolean;
  error?: string;
  balance?: number;
  earned_total?: number;
  spent_total?: number;
  today_earned?: number;
  today_cap?: number;
  recent_activity?: PointsActivity[];
}

export function useUserPoints() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-points', user?.id],
    queryFn: async (): Promise<UserPointsData> => {
      const { data, error } = await supabase.rpc('get_user_points_balance');

      if (error) {
        console.error('[useUserPoints] Error:', error);
        throw new Error(error.message);
      }

      const result = data as unknown as UserPointsResult;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch points');
      }

      return {
        balance: result.balance ?? 0,
        earned_total: result.earned_total ?? 0,
        spent_total: result.spent_total ?? 0,
        today_earned: result.today_earned ?? 0,
        today_cap: result.today_cap ?? 80,
        recent_activity: result.recent_activity ?? []
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });
}

/**
 * Hook to check if user has checked in today
 */
export function useDailyCheckinStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily-checkin-status', user?.id],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('check_daily_checkin_status');

      if (error) {
        console.error('[useDailyCheckinStatus] Error:', error);
        return false;
      }

      const result = data as { success: boolean; checked_in_today?: boolean };
      return result.checked_in_today ?? false;
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Format action type for display
 */
export function formatActionType(actionType: string): string {
  const labels: Record<string, string> = {
    daily_checkin: 'Training Streak',
    wardrobe_add: 'Wardrobe Signal',
    outfit_create: 'Create & Earn',
    redemption: 'Benefit Redeemed'
  };
  return labels[actionType] || actionType;
}

/**
 * Get points required for each redemption tier
 */
export function getRedemptionTiers() {
  return [
    { discount: 25, points: 450, minSpend: 150, label: 'Bronze' },
    { discount: 50, points: 1800, minSpend: 250, label: 'Silver' },
    { discount: 60, points: 2700, minSpend: 350, label: 'Gold' }
  ];
}
