import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types matching actual DB schema
interface Salon {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  brand_id?: string;
  city: string;
  logo_url?: string;
  cover_image_url?: string;
  description?: string;
  address?: string;
  phone?: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface SalonService {
  id: string;
  salon_id: string;
  name: string;
  description?: string;
  category: string;
  price_aed: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

interface SalonRewardOffer {
  id: string;
  salon_id: string;
  title?: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  points_cost: number;
  min_spend_aed?: number;
  cooldown_days: number;
  monthly_cap?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Redemption {
  id: string;
  offer_id: string;
  user_id: string;
  salon_id: string;
  status: string;
  redemption_code?: string;
  approved_at?: string;
  redeemed_at?: string;
  code_expires_at?: string;
  created_at: string;
  points_spent: number;
}

// Hook: Get salon linked to brand
export function useMySalon(brandId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-salon', brandId],
    queryFn: async () => {
      if (!user?.id || !brandId) return null;
      
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('brand_id', brandId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Salon | null;
    },
    enabled: !!user?.id && !!brandId,
  });
}

// Hook: Create salon profile
export function useCreateSalonProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ brandId, name, slug, ownerId, city = 'dubai' }: {
      brandId: string;
      name: string;
      slug: string;
      ownerId: string;
      city?: string;
    }) => {
      const { data, error } = await supabase
        .from('salons')
        .insert({ brand_id: brandId, name, slug, owner_user_id: ownerId, city })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-salon', variables.brandId] });
      toast({ title: 'Salon profile created' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create salon profile.', variant: 'destructive' });
    },
  });
}

// Hook: Get salon services
export function useSalonServices(salonId?: string) {
  return useQuery({
    queryKey: ['salon-services', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from('salon_services')
        .select('*')
        .eq('salon_id', salonId)
        .order('category')
        .order('name');
      if (error) throw error;
      return (data || []) as SalonService[];
    },
    enabled: !!salonId,
  });
}

// Hook: Salon service mutations
export function useSalonServiceMutations(salonId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createService = useMutation({
    mutationFn: async (service: { salon_id: string; name: string; category: string; price_aed: number; duration_minutes: number; description?: string; is_active: boolean }) => {
      const { data, error } = await supabase.from('salon_services').insert(service).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-services', salonId] });
      toast({ title: 'Service added' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to add service.', variant: 'destructive' }),
  });
  
  const updateService = useMutation({
    mutationFn: async ({ serviceId, updates }: { serviceId: string; updates: Partial<SalonService> }) => {
      const { data, error } = await supabase.from('salon_services').update(updates).eq('id', serviceId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-services', salonId] });
      toast({ title: 'Service updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update service.', variant: 'destructive' }),
  });
  
  const deleteService = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from('salon_services').delete().eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-services', salonId] });
      toast({ title: 'Service deleted' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete service.', variant: 'destructive' }),
  });
  
  return { createService, updateService, deleteService };
}

// Hook: Get salon offers
export function useSalonOffers(salonId?: string) {
  return useQuery({
    queryKey: ['salon-offers', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from('salon_reward_offers')
        .select('*')
        .eq('salon_id', salonId)
        .order('discount_value');
      if (error) throw error;
      return (data || []) as SalonRewardOffer[];
    },
    enabled: !!salonId,
  });
}

// Hook: Salon offer mutations
export function useSalonOfferMutations(salonId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createOffer = useMutation({
    mutationFn: async (offer: { salon_id: string; discount_type: string; discount_value: number; points_cost: number; min_spend_aed?: number; cooldown_days: number; monthly_cap?: number; is_active: boolean }) => {
      // Auto-generate title from discount value
      const title = `${offer.discount_value}% Off`;
      const { data, error } = await supabase.from('salon_reward_offers').insert([{ ...offer, title }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-offers', salonId] });
      toast({ title: 'Offer created' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create offer.', variant: 'destructive' }),
  });
  
  const updateOffer = useMutation({
    mutationFn: async ({ offerId, updates }: { offerId: string; updates: Partial<SalonRewardOffer> }) => {
      const { data, error } = await supabase.from('salon_reward_offers').update(updates).eq('id', offerId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-offers', salonId] });
      toast({ title: 'Offer updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update offer.', variant: 'destructive' }),
  });
  
  const deleteOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase.from('salon_reward_offers').delete().eq('id', offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-offers', salonId] });
      toast({ title: 'Offer deleted' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete offer.', variant: 'destructive' }),
  });
  
  return { createOffer, updateOffer, deleteOffer };
}

// Hook: Get salon redemptions
export function useSalonRedemptions(salonId?: string) {
  return useQuery({
    queryKey: ['salon-redemptions', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from('redemptions')
        .select('*, salon_reward_offers(discount_value, points_cost)')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as (Redemption & { salon_reward_offers?: { discount_value: number; points_cost: number } })[];
    },
    enabled: !!salonId,
  });
}

// Hook: Redemption actions
export function useRedemptionActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const approveRedemption = useMutation({
    mutationFn: async (redemptionId: string) => {
      const { data, error } = await supabase.rpc('approve_redemption', { p_redemption_id: redemptionId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-redemptions'] });
      toast({ title: 'Redemption approved' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to approve.', variant: 'destructive' }),
  });
  
  const markRedeemed = useMutation({
    mutationFn: async ({ redemptionId, code }: { redemptionId: string; code: string }) => {
      const { data, error } = await supabase.rpc('mark_redeemed', { p_redemption_id: redemptionId, p_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-redemptions'] });
      toast({ title: 'Marked as redeemed' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to mark as redeemed.', variant: 'destructive' }),
  });
  
  return { approveRedemption, markRedeemed };
}
