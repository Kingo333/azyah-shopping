/**
 * Hook to check user's premium subscription status
 * 
 * This hook reads from the profiles table's premium fields
 * and automatically handles expiry checks and missing profiles.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PremiumStatus {
  isPremium: boolean;
  planType: 'monthly' | 'yearly' | null;
  premiumExpiresAt: Date | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePremium(): PremiumStatus {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [planType, setPlanType] = useState<'monthly' | 'yearly' | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPremiumStatus = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setPlanType(null);
      setPremiumExpiresAt(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Use maybeSingle to handle missing profile gracefully
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('is_premium, plan_type, premium_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching premium status:', fetchError);
        setError(fetchError.message);
        setIsPremium(false);
        setPlanType(null);
        setPremiumExpiresAt(null);
        return;
      }

      // Handle missing profile - create one
      if (!data) {
        console.log('[usePremium] No profile found, creating one for user:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
          // Don't fail - just treat as non-premium
        }
        
        // Default values for new profile
        setIsPremium(false);
        setPlanType(null);
        setPremiumExpiresAt(null);
        return;
      }

      // Handle existing profile
      const rawIsPremium = data.is_premium ?? false;
      const rawPlanType = data.plan_type ?? null;
      const rawExpiresAt = data.premium_expires_at ?? null;

      // Check if premium is still valid (not expired)
      let isActive = rawIsPremium;
      let expiresAt: Date | null = null;

      if (rawExpiresAt) {
        expiresAt = new Date(rawExpiresAt);
        // If there's an expiry date and it's in the past, user is no longer premium
        if (expiresAt < new Date()) {
          isActive = false;
        }
      }

      setIsPremium(isActive);
      setPlanType(rawPlanType as 'monthly' | 'yearly' | null);
      setPremiumExpiresAt(expiresAt);
    } catch (err) {
      console.error('Unexpected error fetching premium status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsPremium(false);
      setPlanType(null);
      setPremiumExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  return {
    isPremium,
    planType,
    premiumExpiresAt,
    loading,
    error,
    refetch: fetchPremiumStatus
  };
}

/**
 * Wait until the server has recorded premium for this user.
 *
 * Premium is granted only by the server (RevenueCat / Stripe webhooks using the
 * service role). The database rejects premium writes from the app, so after a
 * purchase or restore we poll until the webhook has landed.
 */
export async function waitForServerPremium(
  userId: string,
  timeoutMs = 15_000,
  intervalMs = 1_500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .maybeSingle();
    if (data?.is_premium) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
