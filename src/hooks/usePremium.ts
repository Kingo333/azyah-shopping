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
 * Update user's premium status in profiles table
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
      .from('profiles')
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
 * Note: This only writes non-sensitive fields. Apple transaction IDs are 
 * written by the RevenueCat webhook (service role) for security.
 */
export async function syncSubscriptionRecord(
  userId: string,
  planType: 'monthly' | 'yearly',
  expiresAt: Date | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only write non-sensitive subscription fields from client
    // Sensitive payment IDs (apple_transaction_id, etc.) are written 
    // by RevenueCat webhook using service role
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
