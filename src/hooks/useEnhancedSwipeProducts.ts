import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SwipeProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  category_slug: string;
  subcategory_slug?: string;
  image_url?: string;
  media_urls?: any;
  brand_id?: string;
  brands?: { name: string };
  tags?: string[];
  attributes?: any;
  personalization_score?: number;
  // Additional fields for external products
  is_external?: boolean;
  external_url?: string;
  merchant_name?: string;
  ar_mesh_url?: string;
}

interface UseEnhancedSwipeProductsProps {
  filter?: string;
  subcategory?: string;
  gender?: string;
  priceRange?: [number, number];
  searchQuery?: string;
  currency?: string;
}

export const useEnhancedSwipeProducts = ({
  filter,
  subcategory,
  gender,
  priceRange,
  searchQuery,
  currency = 'USD'
}: UseEnhancedSwipeProductsProps = {}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<SwipeProduct[]>([]);
  
  // Fetch products with personalization scores
  const { data: rawProducts, isLoading, refetch } = useQuery({
    queryKey: ['enhanced-swipe-products', filter, subcategory, gender, priceRange, searchQuery, currency],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          category_slug,
          subcategory_slug,
          image_url,
          media_urls,
          brand_id,
          brands!inner(name),
          tags,
          attributes,
          status,
          is_external,
          external_url,
          merchant_name,
          ar_mesh_url
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filter && filter !== 'all') {
        query = query.eq('category_slug', filter as any);
      }
      
      if (subcategory) {
        query = query.eq('subcategory_slug', subcategory as any);
      }
      
      if (gender) {
        query = query.eq('gender', gender as any);
      }
      
      if (priceRange) {
        query = query
          .gte('price_cents', priceRange[0] * 100)
          .lte('price_cents', priceRange[1] * 100);
      }
      
      if (currency) {
        query = query.eq('currency', currency);
      }
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%, brands.name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    }
  });

  // Get personalized scores if user is logged in
  const getPersonalizedProducts = useCallback(async (productList: SwipeProduct[]) => {
    if (!user?.id || !productList.length) {
      return productList.map(p => ({ ...p, personalization_score: 0.5 }));
    }

    try {
      const productIds = productList.map(p => p.id);
      const { data: scores, error } = await supabase.rpc('get_personalized_product_scores', {
        target_user_id: user.id,
        product_ids: productIds
      });

      if (error) {
        console.warn('Failed to get personalization scores:', error);
        return productList.map(p => ({ ...p, personalization_score: 0.5 }));
      }

      // Merge scores with products
      const scoresMap = new Map(scores?.map(s => [s.product_id, s.personalization_score]) || []);
      
      return productList.map(product => ({
        ...product,
        personalization_score: scoresMap.get(product.id) || 0.5
      }));
    } catch (error) {
      console.warn('Error getting personalization scores:', error);
      return productList.map(p => ({ ...p, personalization_score: 0.5 }));
    }
  }, [user?.id]);

  // Apply personalization when products change
  useEffect(() => {
    if (rawProducts) {
      getPersonalizedProducts(rawProducts).then(personalizedProducts => {
        // Sort by personalization score (70%) + randomness (30%)
        const sortedProducts = personalizedProducts.sort((a, b) => {
          const scoreA = (a.personalization_score || 0.5) * 0.7 + Math.random() * 0.3;
          const scoreB = (b.personalization_score || 0.5) * 0.7 + Math.random() * 0.3;
          return scoreB - scoreA;
        });
        
        setProducts(sortedProducts);
      });
    }
  }, [rawProducts, getPersonalizedProducts]);

  return {
    products,
    isLoading,
    refetch
  };
};