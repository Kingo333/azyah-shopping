import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface AffiliatePromo {
  promo_id: string;
  promo_name: string | null;
  affiliate_code: string | null;
  affiliate_url: string | null;
  expires_at: string | null;
  is_active: boolean;
  days_left: number | null;
  outfit_count: number;
  created_at: string;
}

export interface OutfitWithPromoStatus {
  outfit_id: string;
  title: string;
  share_slug: string | null;
  image_preview: string | null;
  is_public: boolean;
  attached_promo_ids: string[] | null;
  attached_promo_names: string[] | null;
}

export interface PublicDeal {
  promo_id: string;
  promo_name: string | null;
  affiliate_code: string | null;
  affiliate_url: string | null;
  expires_at: string | null;
  days_left: number | null;
  attached_outfits: {
    outfit_id: string;
    title: string;
    share_slug: string;
    image_preview: string | null;
  }[];
}

export interface OutfitDeal {
  promo_id: string;
  promo_name: string | null;
  affiliate_code: string | null;
  affiliate_url: string | null;
  expires_at: string | null;
  days_left: number | null;
  owner_username: string | null;
  owner_name: string | null;
}

// Hook: Get owner's promos with outfit counts
export function useMyPromos() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-affiliate-promos', user?.id],
    queryFn: async (): Promise<AffiliatePromo[]> => {
      const { data, error } = await supabase.rpc('get_my_promos_with_outfit_counts');
      if (error) throw error;
      return (data || []) as AffiliatePromo[];
    },
    enabled: !!user?.id,
  });
}

// Hook: Get owner's outfits with promo status
export function useMyOutfitsWithPromoStatus() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-outfits-promo-status', user?.id],
    queryFn: async (): Promise<OutfitWithPromoStatus[]> => {
      const { data, error } = await supabase.rpc('get_my_outfits_with_promo_status');
      if (error) throw error;
      return (data || []) as OutfitWithPromoStatus[];
    },
    enabled: !!user?.id,
  });
}

// Hook: Get public deals for a username (for public deals page)
export function usePublicDeals(username: string | undefined) {
  return useQuery({
    queryKey: ['public-deals', username],
    queryFn: async (): Promise<PublicDeal[]> => {
      if (!username) return [];
      const { data, error } = await supabase.rpc('get_public_deals_for_username', {
        p_username: username
      });
      if (error) throw error;
      return (data || []) as PublicDeal[];
    },
    enabled: !!username,
  });
}

// Hook: Get deal for a specific outfit (for public outfit page) - single deal (backward compat)
export function useOutfitDeal(slug: string | undefined) {
  return useQuery({
    queryKey: ['outfit-deal', slug],
    queryFn: async (): Promise<OutfitDeal | null> => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc('get_public_deal_for_outfit_slug', {
        p_slug: slug
      });
      if (error) throw error;
      return data && data.length > 0 ? (data[0] as OutfitDeal) : null;
    },
    enabled: !!slug,
  });
}

// Hook: Get all deals for a specific outfit (up to 4)
export function useOutfitDeals(slug: string | undefined) {
  return useQuery({
    queryKey: ['outfit-deals', slug],
    queryFn: async (): Promise<OutfitDeal[]> => {
      if (!slug) return [];
      // Use type assertion since new RPC function may not be in generated types yet
      const { data, error } = await (supabase.rpc as any)('get_public_deals_for_outfit_slug', {
        p_slug: slug
      });
      if (error) throw error;
      return (data || []) as OutfitDeal[];
    },
    enabled: !!slug,
  });
}

// Mutation: Create a new promo
export function useCreatePromo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      promo_name?: string;
      affiliate_code?: string;
      affiliate_url?: string;
      expires_at?: string;
    }) => {
      const { error } = await supabase
        .from('affiliate_promos')
        .insert({
          owner_user_id: user!.id,
          promo_name: data.promo_name || null,
          affiliate_code: data.affiliate_code || null,
          affiliate_url: data.affiliate_url || null,
          expires_at: data.expires_at || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate-promos'] });
      toast.success('Promo created!');
    },
    onError: (error) => {
      console.error('Failed to create promo:', error);
      toast.error('Failed to create promo');
    },
  });
}

// Mutation: Update a promo
export function useUpdatePromo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      promo_id: string;
      promo_name?: string;
      affiliate_code?: string;
      affiliate_url?: string;
      expires_at?: string | null;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from('affiliate_promos')
        .update({
          promo_name: data.promo_name,
          affiliate_code: data.affiliate_code,
          affiliate_url: data.affiliate_url,
          expires_at: data.expires_at,
          is_active: data.is_active,
        })
        .eq('id', data.promo_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate-promos'] });
      toast.success('Promo updated!');
    },
    onError: (error) => {
      console.error('Failed to update promo:', error);
      toast.error('Failed to update promo');
    },
  });
}

// Mutation: Delete a promo
export function useDeletePromo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (promoId: string) => {
      const { error } = await supabase
        .from('affiliate_promos')
        .delete()
        .eq('id', promoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate-promos'] });
      queryClient.invalidateQueries({ queryKey: ['my-outfits-promo-status'] });
      toast.success('Promo deleted!');
    },
    onError: (error) => {
      console.error('Failed to delete promo:', error);
      toast.error('Failed to delete promo');
    },
  });
}

// Mutation: Attach promo to outfits (now allows up to 4 promos per outfit)
export function useAttachPromoToOutfits() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { promo_id: string; outfit_ids: string[] }) => {
      // First, get all current attachments for this promo
      const { data: existingAttachments } = await supabase
        .from('affiliate_promo_outfits')
        .select('outfit_id')
        .eq('promo_id', data.promo_id);
      
      const currentOutfitIds = new Set(existingAttachments?.map(a => a.outfit_id) || []);
      const newOutfitIds = new Set(data.outfit_ids);
      
      // Find outfits to remove (were attached, now not in selection)
      const toRemove = [...currentOutfitIds].filter(id => !newOutfitIds.has(id));
      
      // Find outfits to add (not currently attached, now in selection)
      const toAdd = [...newOutfitIds].filter(id => !currentOutfitIds.has(id));
      
      // Remove unselected attachments
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('affiliate_promo_outfits')
          .delete()
          .eq('promo_id', data.promo_id)
          .in('outfit_id', toRemove);
        if (deleteError) throw deleteError;
      }
      
      // Add new attachments
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('affiliate_promo_outfits')
          .insert(toAdd.map(outfit_id => ({
            promo_id: data.promo_id,
            outfit_id,
          })));
        if (insertError) {
          if (insertError.message?.includes('Maximum 4 promo codes')) {
            throw new Error('One or more outfits already have 4 promo codes attached');
          }
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate-promos'] });
      queryClient.invalidateQueries({ queryKey: ['my-outfits-promo-status'] });
      queryClient.invalidateQueries({ queryKey: ['outfit-deals'] });
      toast.success('Promo attached to outfits!');
    },
    onError: (error) => {
      console.error('Failed to attach promo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to attach promo');
    },
  });
}

// Mutation: Detach a specific promo from an outfit (not all promos)
export function useDetachPromoFromOutfit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { promo_id: string; outfit_id: string }) => {
      const { error } = await supabase
        .from('affiliate_promo_outfits')
        .delete()
        .eq('promo_id', data.promo_id)
        .eq('outfit_id', data.outfit_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate-promos'] });
      queryClient.invalidateQueries({ queryKey: ['my-outfits-promo-status'] });
      queryClient.invalidateQueries({ queryKey: ['outfit-deals'] });
      toast.success('Promo detached!');
    },
    onError: (error) => {
      console.error('Failed to detach promo:', error);
      toast.error('Failed to detach promo');
    },
  });
}
