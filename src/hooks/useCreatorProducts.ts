import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CreatorProduct {
  id: string;
  user_id: string;
  product_id: string | null;
  external_url: string | null;
  external_title: string | null;
  external_image_url: string | null;
  external_price_cents: number | null;
  external_currency: string | null;
  external_brand_name: string | null;
  external_brand_logo_url: string | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
  product?: {
    id: string;
    title: string;
    media_urls: string[] | null;
    price_cents: number;
    currency: string;
    brand?: {
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

export interface AddCreatorProductInput {
  product_id?: string;
  external_url?: string;
  external_title?: string;
  external_image_url?: string;
  external_price_cents?: number;
  external_currency?: string;
  external_brand_name?: string;
  external_brand_logo_url?: string;
  is_featured?: boolean;
}

export const useCreatorProducts = (userId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === userId;

  const productsQuery = useQuery({
    queryKey: ['creator-products', userId],
    queryFn: async (): Promise<CreatorProduct[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('creator_products')
        .select(`
          id,
          user_id,
          product_id,
          external_url,
          external_title,
          external_image_url,
          external_price_cents,
          external_currency,
          external_brand_name,
          external_brand_logo_url,
          sort_order,
          is_featured,
          created_at,
          product:products(
            id,
            title,
            media_urls,
            price_cents,
            currency,
            brand:brands(name, logo_url)
          )
        `)
        .eq('user_id', userId)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching creator products:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        product: item.product as CreatorProduct['product']
      }));
    },
    enabled: !!userId,
  });

  const addProduct = useMutation({
    mutationFn: async (input: AddCreatorProductInput) => {
      if (!user) throw new Error('Must be logged in');

      // Get the next sort order
      const { data: existing } = await supabase
        .from('creator_products')
        .select('sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder = (existing?.[0]?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from('creator_products')
        .insert({
          user_id: user.id,
          product_id: input.product_id || null,
          external_url: input.external_url || null,
          external_title: input.external_title || null,
          external_image_url: input.external_image_url || null,
          external_price_cents: input.external_price_cents || null,
          external_currency: input.external_currency || 'USD',
          external_brand_name: input.external_brand_name || null,
          external_brand_logo_url: input.external_brand_logo_url || null,
          is_featured: input.is_featured || false,
          sort_order: nextSortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-products', userId] });
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('creator_products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-products', userId] });
    },
  });

  const removeAllProducts = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('creator_products')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-products', userId] });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ productId, isFeatured }: { productId: string; isFeatured: boolean }) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('creator_products')
        .update({ is_featured: isFeatured })
        .eq('id', productId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-products', userId] });
    },
  });

  const updateSortOrder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!user) throw new Error('Must be logged in');

      // Update each product's sort order
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('creator_products')
          .update({ sort_order: index })
          .eq('id', id)
          .eq('user_id', user.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-products', userId] });
    },
  });

  return {
    products: productsQuery.data || [],
    featuredProducts: (productsQuery.data || []).filter(p => p.is_featured),
    recentProducts: (productsQuery.data || []).filter(p => !p.is_featured),
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    error: productsQuery.error,
    refetch: productsQuery.refetch,
    addProduct,
    removeProduct,
    removeAllProducts,
    toggleFeatured,
    updateSortOrder,
    isOwner,
  };
};
