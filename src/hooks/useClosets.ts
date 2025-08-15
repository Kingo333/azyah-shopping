import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Closet {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  items?: ClosetItem[];
}

export interface ClosetItem {
  id: string;
  closet_id: string;
  product_id: string;
  added_at: string;
  sort_order: number;
  products: {
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

export interface ClosetRating {
  id: string;
  closet_id: string;
  user_id: string;
  rating: number;
  created_at: string;
}

export const useClosets = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['closets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: closets, error } = await supabase
        .from('closets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get items for each closet
      const closetsWithItems = await Promise.all(
        (closets || []).map(async (closet) => {
          const { data: items } = await supabase
            .from('closet_items')
            .select('*')
            .eq('closet_id', closet.id);
          
          return {
            ...closet,
            items: items || []
          };
        })
      );

      return closetsWithItems as Closet[];
    },
    enabled: !!user?.id
  });
};

export const usePublicClosets = () => {
  return useQuery({
    queryKey: ['public_closets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('closets')
        .select(`
          *,
          users!inner (name, avatar_url),
          closet_ratings (rating)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useClosetItems = (closetId: string) => {
  return useQuery({
    queryKey: ['closet_items', closetId],
    queryFn: async () => {
      if (!closetId) return [];

      const { data: items, error } = await supabase
        .from('closet_items')
        .select('id, closet_id, product_id, added_at, sort_order')
        .eq('closet_id', closetId)
        .order('sort_order');

      if (error) throw error;
      if (!items?.length) return [];

      // Get product details
      const productIds = items.map(item => item.product_id);
      const { data: products, error: productsError } = await supabase
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

      // Combine data
      const result = items.map(item => ({
        ...item,
        products: products?.find(p => p.id === item.product_id)
      })).filter(item => item.products) as ClosetItem[];

      return result;
    },
    enabled: !!closetId
  });
};

export const useCreateCloset = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, description, is_public }: { title: string; description?: string; is_public?: boolean }) => {
      const { data, error } = await supabase
        .from('closets')
        .insert({
          user_id: user?.id,
          title,
          description,
          is_public: is_public || false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closets'] });
      toast({
        title: "Closet created",
        description: "Your new closet has been created successfully."
      });
    }
  });
};

export const useAddToCloset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ closetId, productId }: { closetId: string; productId: string }) => {
      const { data, error } = await supabase
        .from('closet_items')
        .insert({
          closet_id: closetId,
          product_id: productId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closet_items'] });
      toast({
        title: "Added to closet",
        description: "Item has been added to your closet."
      });
    }
  });
};

export const useRateCloset = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ closetId, rating }: { closetId: string; rating: number }) => {
      const { data, error } = await supabase
        .from('closet_ratings')
        .upsert({
          closet_id: closetId,
          user_id: user?.id,
          rating
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public_closets'] });
      toast({
        title: "Rating submitted",
        description: "Thank you for your rating!"
      });
    }
  });
};

export const useRemoveFromCloset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('closet_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closet_items'] });
      toast({
        title: "Removed from closet",
        description: "Item has been removed from your closet."
      });
    }
  });
};
