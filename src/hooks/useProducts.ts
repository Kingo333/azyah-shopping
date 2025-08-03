import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, SwipeAction } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useProducts = (filters?: {
  category?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          brand:brands(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category_slug', filters.category);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error fetching products",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      return data as Product[];
    }
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          retailer:retailers(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        toast({
          title: "Error fetching product",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      return data as Product;
    },
    enabled: !!id
  });
};

export const useSwipeProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      action, 
      userId 
    }: { 
      productId: string; 
      action: 'right' | 'up' | 'left'; 
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('swipes')
        .insert({
          user_id: userId,
          product_id: productId,
          action,
          session_id: crypto.randomUUID()
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error recording swipe",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      return data as SwipeAction;
    },
    onSuccess: () => {
      // Invalidate and refetch products to get fresh recommendations
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (error) {
        toast({
          title: "Error fetching categories",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      return data;
    }
  });
};