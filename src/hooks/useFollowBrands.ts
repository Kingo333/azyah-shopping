import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';

interface BrandFollowDetail {
  brand_id: string;
  name: string;
  logo_url: string | null;
  slug: string;
}

/**
 * Hook for brand follow management using the dedicated `brand_follows` table.
 */
export function useFollowBrands() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch followed brand IDs
  const { data: followedIdsArray, isLoading: followsLoading } = useQuery({
    queryKey: ['brand-follows', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('brand_follows')
        .select('brand_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map(d => d.brand_id);
    },
    enabled: !!user?.id,
  });

  const followedIds = useMemo(() => new Set(followedIdsArray || []), [followedIdsArray]);

  // Fetch followed brands with details (name + logo) in a single join query
  const { data: followedBrandsDetails } = useQuery({
    queryKey: ['brand-follows-details', user?.id],
    queryFn: async (): Promise<BrandFollowDetail[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('brand_follows')
        .select('brand_id, brands:brand_id(name, logo_url, slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || [])
        .filter((d: any) => d.brands)
        .map((d: any) => ({
          brand_id: d.brand_id,
          name: d.brands.name,
          logo_url: d.brands.logo_url,
          slug: d.brands.slug,
        }));
    },
    enabled: !!user?.id,
  });

  const isFollowingBrand = useCallback(
    (brandId: string) => followedIds.has(brandId),
    [followedIds],
  );

  const invalidateFollows = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['brand-follows'] });
    queryClient.invalidateQueries({ queryKey: ['brand-follows-details'] });
  }, [queryClient]);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (brandId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('brand_follows')
        .insert({ user_id: user.id, brand_id: brandId });
      if (error && error.code !== '23505') throw error;
    },
    onMutate: async (brandId) => {
      await queryClient.cancelQueries({ queryKey: ['brand-follows', user?.id] });
      const previous = queryClient.getQueryData<string[]>(['brand-follows', user?.id]);
      queryClient.setQueryData<string[]>(['brand-follows', user?.id], old => [
        ...(old || []),
        brandId,
      ]);
      return { previous };
    },
    onError: (_err, _brandId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['brand-follows', user?.id], context.previous);
      }
      toast({ title: 'Error', description: 'Could not follow brand.', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ description: 'Following brand!' });
    },
    onSettled: () => invalidateFollows(),
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (brandId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('brand_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('brand_id', brandId);
      if (error) throw error;
    },
    onMutate: async (brandId) => {
      await queryClient.cancelQueries({ queryKey: ['brand-follows', user?.id] });
      const previous = queryClient.getQueryData<string[]>(['brand-follows', user?.id]);
      queryClient.setQueryData<string[]>(['brand-follows', user?.id], old =>
        (old || []).filter(id => id !== brandId),
      );
      return { previous };
    },
    onError: (_err, _brandId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['brand-follows', user?.id], context.previous);
      }
      toast({ title: 'Error', description: 'Could not unfollow brand.', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ description: 'Unfollowed brand.' });
    },
    onSettled: () => invalidateFollows(),
  });

  const toggleFollowBrand = useCallback(
    (brandId: string) => {
      if (isFollowingBrand(brandId)) {
        unfollowMutation.mutate(brandId);
      } else {
        followMutation.mutate(brandId);
      }
    },
    [isFollowingBrand, followMutation, unfollowMutation],
  );

  return {
    followedIds,
    followedBrands: followedBrandsDetails || [],
    followsLoading,
    isFollowingBrand,
    toggleFollowBrand,
    followBrand: followMutation.mutate,
    unfollowBrand: unfollowMutation.mutate,
    isToggling: followMutation.isPending || unfollowMutation.isPending,
  };
}
