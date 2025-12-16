/**
 * Hook to check user's premium subscription status
 * 
 * This hook reads from the users table's premium fields
 * and automatically handles expiry checks.
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
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('is_premium, plan_type, premium_expires_at')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching premium status:', fetchError);
        setError(fetchError.message);
        setIsPremium(false);
        setPlanType(null);
        setPremiumExpiresAt(null);
        return;
      }

      // Handle missing/null values safely
      const rawIsPremium = (data as any)?.is_premium ?? false;
      const rawPlanType = (data as any)?.plan_type ?? null;
      const rawExpiresAt = (data as any)?.premium_expires_at ?? null;

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
 * Update user's premium status in Supabase
 * This is called after a successful IAP purchase
 */
export async function updatePremiumStatus(
  userId: string,
  isPremium: boolean,
  planType: 'monthly' | 'yearly' | null,
  expiresAt: Date | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        is_premium: isPremium,
        plan_type: planType,
        premium_expires_at: expiresAt?.toISOString() ?? null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating premium status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating premium status:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Also update the subscriptions table for consistency
 */
export async function syncSubscriptionRecord(
  userId: string,
  planType: 'monthly' | 'yearly',
  expiresAt: Date | null,
  appleTransactionId?: string,
  appleProductId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: planType,
        plan_tier: planType,
        status: 'active',
        currency: 'AED',
        price_cents: planType === 'yearly' ? 20000 : 3000,
        current_period_end: expiresAt?.toISOString() ?? null,
        apple_transaction_id: appleTransactionId ?? null,
        apple_product_id: appleProductId ?? null,
        features_granted: {
          ugc_collaboration: true,
          ai_tryon_limit: 10,
          early_access: true,
          premium_support: true
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error syncing subscription record:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error syncing subscription:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}
