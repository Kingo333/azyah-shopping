import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LikedProduct {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: any;
    external_url: string;
    brands: { name: string } | null;
  } | null;
}

export const useLikedProducts = () => {
  const { user } = useAuth();

  const { data: likedProducts, isLoading, error } = useQuery({
    queryKey: ['liked-products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the liked product IDs
      const { data: likeData, error: likesError } = await supabase
        .from('likes')
        .select('id, product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;
      if (!likeData?.length) return [];

      // Then get the products with their details
      const productIds = likeData.map(like => like.product_id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          brands (name)
        `)
        .in('id', productIds);

      if (productsError) throw productsError;

      // Combine the data and return products directly
      const result = likeData.map(like => {
        const product = products?.find(p => p.id === like.product_id);
        return product ? {
          ...product,
          like_id: like.id,
          liked_at: like.created_at
        } : null;
      }).filter(Boolean);

      return result;
    },
    enabled: !!user?.id
  });

  return {
    likedProducts: likedProducts || [],
    isLoading,
    error,
    hasLikedProducts: !!likedProducts?.length
  };
};