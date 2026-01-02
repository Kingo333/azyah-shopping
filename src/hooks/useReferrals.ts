import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referral_code: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'blocked';
  qualified_at: string | null;
  rewarded_at: string | null;
  points_awarded: number;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  qualified_referrals: number;
  rewarded_referrals: number;
  total_points_earned: number;
}

// Get user's referral code
export const useUserReferralCode = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-referral-code', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data?.referral_code as string | null;
    },
    enabled: !!user,
  });
};

// Get user's referral stats
export const useReferralStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async (): Promise<ReferralStats> => {
      if (!user) {
        return {
          total_referrals: 0,
          qualified_referrals: 0,
          rewarded_referrals: 0,
          total_points_earned: 0,
        };
      }

      const { data, error } = await supabase
        .from('referrals')
        .select('status, points_awarded')
        .eq('referrer_id', user.id);

      if (error) throw error;

      const referrals = data || [];
      return {
        total_referrals: referrals.length,
        qualified_referrals: referrals.filter(r => r.status === 'qualified' || r.status === 'rewarded').length,
        rewarded_referrals: referrals.filter(r => r.status === 'rewarded').length,
        total_points_earned: referrals.reduce((sum, r) => sum + (r.points_awarded || 0), 0),
      };
    },
    enabled: !!user,
  });
};

// Validate a referral code - uses users_public view for cross-user lookups
export const useValidateReferralCode = () => {
  return useMutation({
    mutationFn: async (code: string): Promise<{ valid: boolean; referrer_id?: string }> => {
      if (!code || code.length < 6) {
        return { valid: false };
      }

      // Use users_public view which allows reading other users' referral codes
      const { data, error } = await supabase
        .from('users_public')
        .select('id, referral_code')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (error || !data) {
        return { valid: false };
      }

      return { valid: true, referrer_id: data.id };
    },
  });
};

// Apply referral code for new user - uses users_public for cross-user lookups
export const useApplyReferralCode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<boolean> => {
      if (!user || !code) return false;

      // Find referrer by code using users_public view
      const { data: referrer, error: lookupError } = await supabase
        .from('users_public')
        .select('id')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (lookupError || !referrer) {
        throw new Error('Invalid referral code');
      }

      // Block self-referral
      if (referrer.id === user.id) {
        throw new Error('Cannot use your own referral code');
      }

      // Check if user already has a referral
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .single();

      if (existingReferral) {
        throw new Error('You already have a referral applied');
      }

      // Create referral record
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.id,
          referred_id: user.id,
          referral_code: code.toUpperCase(),
          status: 'pending',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Referral already applied');
        }
        throw insertError;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
      toast.success('Referral code applied!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply referral code');
    },
  });
};

// Share referral code
export const shareReferralCode = async (code: string) => {
  const shareUrl = `${window.location.origin}/onboarding/signup?ref=${code}`;
  const shareData = {
    title: 'Join Azyah!',
    text: `Use my referral code ${code} to join Azyah and we both earn points!`,
    url: shareUrl,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Referral link copied to clipboard!');
    }
  } catch (error) {
    // User cancelled share
  }
};

// Copy referral code to clipboard
export const copyReferralCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success('Referral code copied!');
  } catch (error) {
    toast.error('Failed to copy code');
  }
};