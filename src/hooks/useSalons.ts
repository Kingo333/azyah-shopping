/**
 * Hooks for fetching salons and salon reward offers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types based on database schema
export interface Salon {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  address: string | null;
  city: string; // Changed from enum to text for flexibility
  phone: string | null;
  instagram: string | null;
  website: string | null;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_active: boolean;
  brand_id?: string | null;
}

export interface SalonRewardOffer {
  id: string;
  salon_id: string;
  title: string;
  description: string | null;
  service_category: string | null;
  discount_type: 'PERCENT' | 'FREE';
  discount_value: number;
  points_cost: number;
  min_spend_aed: number;
  requires_approval: boolean;
  cooldown_days: number;
  monthly_cap: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  // Joined data
  salon?: Salon;
}

export interface Redemption {
  id: string;
  user_id: string;
  salon_id: string;
  offer_id: string;
  points_spent: number;
  status: 'requested' | 'approved' | 'redeemed' | 'expired' | 'cancelled';
  redemption_code: string | null;
  code_expires_at: string | null;
  approved_at: string | null;
  redeemed_at: string | null;
  created_at: string;
  // Joined data
  salon?: Salon;
  offer?: SalonRewardOffer;
}

/**
 * Fetch all active salons, filtered by shopper's country for country-gated rewards
 * @param shopperCountry - Optional shopper country code (ISO2) or name for filtering
 */
export function useSalons(shopperCountry?: string) {
  return useQuery({
    queryKey: ['salons', shopperCountry],
    queryFn: async (): Promise<Salon[]> => {
      // Fetch salons with their linked brand for country matching
      const { data, error } = await supabase
        .from('salons')
        .select(`
          *,
          brand:brands!salons_brand_id_fkey(country_code, shipping_regions)
        `)
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) {
        console.error('[useSalons] Error:', error);
        throw new Error(error.message);
      }

      const salons = (data || []) as (Salon & { brand?: { country_code: string | null; shipping_regions: string[] | null } })[];

      // If no country filter, return all salons
      if (!shopperCountry) {
        return salons;
      }

      // Normalize shopper country (could be code or name)
      const normalizedCountry = shopperCountry.length === 2 
        ? shopperCountry.toUpperCase() 
        : shopperCountry;

      // Filter salons by brand country or shipping regions
      return salons.filter(salon => {
        if (!salon.brand) return false;
        
        const brandCountry = salon.brand.country_code;
        const regions = salon.brand.shipping_regions || [];
        
        // Match by country code
        if (brandCountry === normalizedCountry) return true;
        
        // Match by country name in regions (for backwards compatibility)
        if (regions.includes(normalizedCountry)) return true;
        if (regions.includes('WORLDWIDE')) return true;
        
        return false;
      });
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

/**
 * Fetch a single salon by slug
 */
export function useSalon(slug: string) {
  return useQuery({
    queryKey: ['salon', slug],
    queryFn: async (): Promise<Salon | null> => {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('[useSalon] Error:', error);
        throw new Error(error.message);
      }

      return data as Salon | null;
    },
    enabled: !!slug
  });
}

/**
 * Fetch all active offers for a salon
 */
export function useSalonOffers(salonId?: string) {
  return useQuery({
    queryKey: ['salon-offers', salonId],
    queryFn: async (): Promise<SalonRewardOffer[]> => {
      let query = supabase
        .from('salon_reward_offers')
        .select(`
          *,
          salon:salons(*)
        `)
        .eq('is_active', true)
        .order('points_cost', { ascending: true });

      if (salonId) {
        query = query.eq('salon_id', salonId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSalonOffers] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as SalonRewardOffer[];
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}

/**
 * Fetch user's redemptions
 */
export function useRedemptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['redemptions', user?.id],
    queryFn: async (): Promise<Redemption[]> => {
      const { data, error } = await supabase
        .from('redemptions')
        .select(`
          *,
          salon:salons(*),
          offer:salon_reward_offers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useRedemptions] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as Redemption[];
    },
    enabled: !!user
  });
}

/**
 * Redeem an offer (Premium-only)
 */
export function useRedeemOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.rpc('redeem_offer', {
        p_offer_id: offerId
      });

      if (error) {
        console.error('[useRedeemOffer] Error:', error);
        throw new Error(error.message);
      }

      const result = data as {
        success: boolean;
        error?: string;
        upgrade_required?: boolean;
        redemption_id?: string;
        requires_approval?: boolean;
        discount_value?: number;
        min_spend_aed?: number;
      };

      if (!result.success) {
        if (result.upgrade_required) {
          throw new Error('UPGRADE_REQUIRED');
        }
        throw new Error(result.error || 'Failed to redeem offer');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      
      if (data.requires_approval) {
        toast.success('Redemption requested!', {
          description: 'Waiting for salon approval. Check back soon!'
        });
      } else {
        toast.success(`${data.discount_value}% off redeemed!`, {
          description: `Show this at checkout. Min spend: AED ${data.min_spend_aed}`
        });
      }
    },
    onError: (error: Error) => {
      if (error.message === 'UPGRADE_REQUIRED') {
        toast.error('Premium required', {
          description: 'Upgrade to Premium to redeem salon rewards'
        });
      } else {
        toast.error('Redemption failed', {
          description: error.message
        });
      }
    }
  });
}
