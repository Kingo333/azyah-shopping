import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { CreatorPayout, PayoutStatus } from '@/types/ugc';

// Creator's payouts
export const useCreatorPayouts = (collabId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['creator-payouts', user?.id, collabId],
    queryFn: async (): Promise<CreatorPayout[]> => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('creator_payouts')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      
      if (collabId) {
        query = query.eq('collab_id', collabId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CreatorPayout[];
    },
    enabled: !!user?.id
  });
};

// Campaign payouts for brand/retailer owners
export const useCampaignPayouts = (collabId: string) => {
  return useQuery({
    queryKey: ['campaign-payouts', collabId],
    queryFn: async (): Promise<CreatorPayout[]> => {
      const { data, error } = await supabase
        .from('creator_payouts')
        .select('*')
        .eq('collab_id', collabId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as CreatorPayout[];
    },
    enabled: !!collabId
  });
};

// Update payout status via RPC
export const useUpdatePayoutStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      payoutId, 
      status, 
      reason 
    }: {
      payoutId: string;
      status: 'paid' | 'confirmed' | 'unpaid_issue';
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_payout_status', {
        p_payout_id: payoutId,
        p_status: status,
        p_reason: reason || null
      });
      
      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to update payout status');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-payouts'] });
      
      const messages = {
        paid: 'Payout marked as paid',
        confirmed: 'Payout confirmed',
        unpaid_issue: 'Payout issue reported'
      };
      
      toast({
        title: messages[variables.status],
        description: variables.status === 'unpaid_issue'
          ? 'Your issue has been recorded. Consider leaving a review.'
          : 'Status updated successfully.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Calculate total earnings summary
export const useEarningsSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['earnings-summary', user?.id],
    queryFn: async () => {
      if (!user?.id) return { owed: 0, paid: 0, pending: 0, issues: 0 };
      
      const { data, error } = await supabase
        .from('creator_payouts')
        .select('amount, status, currency')
        .eq('creator_id', user.id);
      
      if (error) throw error;
      
      const summary = {
        owed: 0,
        paid: 0,
        pending: 0,
        issues: 0
      };
      
      data?.forEach(payout => {
        const amount = Number(payout.amount) || 0;
        switch (payout.status) {
          case 'owed':
          case 'hold':
          case 'confirmed':
            summary.owed += amount;
            break;
          case 'paid':
            summary.paid += amount;
            break;
          case 'pending_approval':
            summary.pending += amount;
            break;
          case 'unpaid_issue':
            summary.issues += amount;
            break;
        }
      });
      
      return summary;
    },
    enabled: !!user?.id
  });
};
