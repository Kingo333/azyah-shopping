import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface EnhancedClosetItem {
  id: string;
  closet_id: string;
  product_id?: string;
  external_product_id?: string;
  title?: string;
  brand?: string;
  price_cents?: number;
  currency?: string;
  image_url?: string;
  image_bg_removed_url?: string;
  category?: string;
  color?: string;
  attrs?: any;
  added_at: string;
  sort_order: number;
  products?: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: any;
    brands: {
      name: string;
    };
  };
}

export type ClosetItemFilter = 'all' | 'saved' | 'purchased' | 'wishlist';

// Enhanced hook to get closet items with filtering
export const useEnhancedClosetItems = (
  closetId: string, 
  filter: ClosetItemFilter = 'all',
  searchQuery: string = '',
  categoryFilter: string = '',
  brandFilter: string = '',
  colorFilter: string = ''
) => {
  return useQuery({
    queryKey: ['enhanced_closet_items', closetId, filter, searchQuery, categoryFilter, brandFilter, colorFilter],
    queryFn: async () => {
      if (!closetId) return [];

      let query = supabase
        .from('closet_items')
        .select('*')
        .eq('closet_id', closetId);

      // Apply filters based on type
      if (filter === 'wishlist') {
        // Items from wishlist
        query = query.not('product_id', 'is', null);
      }

      const { data: items, error } = await query.order('sort_order');

      if (error) throw error;
      if (!items?.length) return [];

      // Get product details for items that have product_id
      const productItems = items.filter(item => item.product_id);
      let products = [];

      if (productItems.length > 0) {
        const productIds = productItems.map(item => item.product_id);
        const { data: productData, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            title,
            price_cents,
            currency,
            media_urls,
            brands!inner (name)
          `)
          .in('id', productIds);

        if (productsError) throw productsError;
        products = productData || [];
      }

      // Combine data and apply client-side filters
      let result = items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          ...item,
          products: product,
          // Use product data as fallback for empty fields
          title: item.title || product?.title,
          brand: item.brand || product?.brands?.name,
          price_cents: item.price_cents || product?.price_cents,
          currency: item.currency || product?.currency,
          image_url: item.image_url || (product?.media_urls?.[0] || '/placeholder.svg')
        } as EnhancedClosetItem;
      });

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(item => 
          item.title?.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
        );
      }

      // Apply category filter
      if (categoryFilter) {
        result = result.filter(item => item.category === categoryFilter);
      }

      // Apply brand filter
      if (brandFilter) {
        result = result.filter(item => item.brand === brandFilter);
      }

      // Apply color filter
      if (colorFilter) {
        result = result.filter(item => item.color === colorFilter);
      }

      return result;
    },
    enabled: !!closetId
  });
};

// Hook to add external product to closet
export const useAddExternalProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      closetId, 
      productData 
    }: { 
      closetId: string;
      productData: {
        external_product_id?: string;
        title: string;
        brand?: string;
        price_cents?: number;
        currency?: string;
        image_url?: string;
        category?: string;
        color?: string;
        attrs?: any;
      };
    }) => {
      const { data, error } = await supabase
        .from('closet_items')
        .insert({
          closet_id: closetId,
          product_id: null, // This ensures product_id field is included
          ...productData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced_closet_items'] });
      toast({
        title: "Item added",
        description: "Item has been added to your closet."
      });
    }
  });
};

// Hook to update closet item
export const useUpdateClosetItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      updates 
    }: { 
      itemId: string;
      updates: Partial<EnhancedClosetItem>;
    }) => {
      const { data, error } = await supabase
        .from('closet_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced_closet_items'] });
    }
  });
};

// Hook to get all unique categories from user's closet items
export const useClosetCategories = (closetId: string) => {
  return useQuery({
    queryKey: ['closet_categories', closetId],
    queryFn: async () => {
      if (!closetId) return [];

      const { data, error } = await supabase
        .from('closet_items')
        .select('category')
        .eq('closet_id', closetId)
        .not('category', 'is', null);

      if (error) throw error;

      const categories = [...new Set(data.map(item => item.category))].filter(Boolean);
      return categories;
    },
    enabled: !!closetId
  });
};

// Hook to get all unique brands from user's closet items
export const useClosetBrands = (closetId: string) => {
  return useQuery({
    queryKey: ['closet_brands', closetId],
    queryFn: async () => {
      if (!closetId) return [];

      const { data, error } = await supabase
        .from('closet_items')
        .select('brand')
        .eq('closet_id', closetId)
        .not('brand', 'is', null);

      if (error) throw error;

      const brands = [...new Set(data.map(item => item.brand))].filter(Boolean);
      return brands;
    },
    enabled: !!closetId
  });
};

// Hook to get all unique colors from user's closet items
export const useClosetColors = (closetId: string) => {
  return useQuery({
    queryKey: ['closet_colors', closetId],
    queryFn: async () => {
      if (!closetId) return [];

      const { data, error } = await supabase
        .from('closet_items')
        .select('color')
        .eq('closet_id', closetId)
        .not('color', 'is', null);

      if (error) throw error;

      const colors = [...new Set(data.map(item => item.color))].filter(Boolean);
      return colors;
    },
    enabled: !!closetId
  });
};