/**
 * Hook to award points for user actions
 * 
 * ONLY 3 action types are allowed (enforced server-side):
 * - daily_checkin: +10 pts, max 1/day
 * - wardrobe_add: +2 pts, max 10/day
 * - outfit_create: +12 pts, max 3/day
 * 
 * Hard daily cap: 80 points/day
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PointsActionType = 'daily_checkin' | 'wardrobe_add' | 'outfit_create';

interface AwardPointsParams {
  actionType: PointsActionType;
  sourceId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  showToast?: boolean;
}

interface AwardPointsResult {
  success: boolean;
  points_awarded?: number;
  action_type?: string;
  new_daily_total?: number;
  error?: string;
  duplicate?: boolean;
  limit?: number;
}

export function useAwardPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionType,
      sourceId,
      idempotencyKey,
      metadata = {}
    }: AwardPointsParams): Promise<AwardPointsResult> => {
      const { data, error } = await supabase.rpc('award_points', {
        p_action_type: actionType,
        p_source_id: sourceId || null,
        p_idempotency_key: idempotencyKey || null,
        p_metadata: metadata as unknown as Record<string, never>
      });

      if (error) {
        console.error('[useAwardPoints] RPC error:', error);
        throw new Error(error.message);
      }

      return data as unknown as AwardPointsResult;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate points balance query
        queryClient.invalidateQueries({ queryKey: ['user-points'] });
        
        // Show toast if requested (default: true for manual actions)
        if (variables.showToast !== false) {
          const actionLabels: Record<PointsActionType, string> = {
            daily_checkin: 'Training streak',
            wardrobe_add: 'Wardrobe signal added',
            outfit_create: 'Create & Earn signal'
          };
          
          toast.success(`+${data.points_awarded} points!`, {
            description: actionLabels[variables.actionType],
            duration: 2000
          });
        }
      } else if (data.duplicate) {
        // Silently ignore duplicates - this is expected behavior
        console.log('[useAwardPoints] Duplicate award attempt ignored');
      } else if (data.limit) {
        // Show limit reached message only for manual actions
        if (variables.showToast !== false) {
          toast.info('Daily limit reached', {
            description: `You've earned the maximum for ${variables.actionType} today`,
            duration: 3000
          });
        }
      }
    },
    onError: (error) => {
      console.error('[useAwardPoints] Error:', error);
      // Don't show error toast for points - it shouldn't block the main action
    }
  });
}

/**
 * Convenience function to award points after a successful action
 * Fire-and-forget - doesn't block the main flow
 * @param showToast - Whether to show a toast notification (default: true)
 * @returns The points awarded, or null if failed/duplicate/limit
 */
export async function awardPointsAsync(
  actionType: PointsActionType,
  sourceId?: string,
  idempotencyKey?: string,
  showToast: boolean = true
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('award_points', {
      p_action_type: actionType,
      p_source_id: sourceId || null,
      p_idempotency_key: idempotencyKey || null,
      p_metadata: {} as unknown as Record<string, never>
    });

    if (error) {
      console.error('[awardPointsAsync] Error:', error);
      return null;
    }

    const result = data as unknown as AwardPointsResult;
    
    if (result.success) {
      if (showToast) {
        toast.success(`+${result.points_awarded} points!`, { duration: 2000 });
      }
      return result.points_awarded || null;
    }
    
    return null;
  } catch (err) {
    console.error('[awardPointsAsync] Unexpected error:', err);
    return null;
  }
}
