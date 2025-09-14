import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getProductImageUrls } from '@/utils/imageHelpers';

interface SwipeProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  category_slug: string;
  subcategory_slug?: string;
  image_url?: string;
  image_urls?: string[];
  media_urls?: any;
  brand_id?: string;
  brand?: any; // From secure function
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
  
  // Debounced invalidation to reduce excessive re-fetching
  const debouncedInvalidation = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // Invalidation logic will be handled by tracking hook
        }, 500);
      };
    })(),
    []
  );
  
  // Fetch products with personalization scores using secure function
  const { data: rawProducts, isLoading, refetch } = useQuery({
    queryKey: ['enhanced-swipe-products', filter, subcategory, gender, priceRange, searchQuery, currency],
    queryFn: async () => {
      console.log('🔄 Enhanced swipe products: Fetching with secure function');
      
      // Use the secure function for consistent data access
      const { data, error } = await supabase.rpc('get_public_products_secure', {
        limit_param: 100,
        offset_param: 0,
        category_filter: filter && filter !== 'all' ? filter : null
      });

      if (error) {
        console.error('❌ Enhanced swipe products: Failed to fetch products:', error);
        throw error;
      }
      
      let products = data || [];
      console.log(`✅ Enhanced swipe products: Fetched ${products.length} products from secure function`);
      
      // Apply additional client-side filters
      if (subcategory) {
        products = products.filter(p => p.subcategory_slug === subcategory);
      }
      
      if (gender) {
        products = products.filter(p => p.gender === gender);
      }
      
      if (priceRange) {
        products = products.filter(p => 
          p.price_cents >= priceRange[0] * 100 && 
          p.price_cents <= priceRange[1] * 100
        );
      }
      
      if (currency) {
        products = products.filter(p => p.currency === currency);
      }
      
      if (searchQuery) {
        const searchTerm = searchQuery.toLowerCase();
        products = products.filter(p => {
          const title = p.title?.toLowerCase() || '';
          const brandName = (p.brand as any)?.name?.toLowerCase() || '';
          return title.includes(searchTerm) || brandName.includes(searchTerm);
        });
      }
      
      console.log(`🎯 Enhanced swipe products: After filtering: ${products.length} products`);
      return products;
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
      
      return productList.map(product => {
        const brandName = (product.brand as any)?.name || product.brands?.name || product.merchant_name;
        console.log('🔄 Processing enhanced swipe product:', product.id, 'Brand:', brandName);
        
        // Use standardized image helper for consistent image processing
        const imageUrls = getProductImageUrls(product);
        console.log('📸 Enhanced swipe product images:', product.id, 'URLs:', imageUrls);
        
        return {
          ...product,
          personalization_score: scoresMap.get(product.id) || 0.5,
          image_urls: imageUrls,
          image_url: imageUrls[0] || '/placeholder.svg',
          // Keep original media_urls for compatibility and ensure brand access
          media_urls: product.media_urls,
          brands: product.brand ? { name: (product.brand as any)?.name } : product.brands
        };
      });
    } catch (error) {
      console.warn('Error getting personalization scores:', error);
      return productList.map(p => ({ ...p, personalization_score: 0.5 }));
    }
  }, [user?.id]);

  // Memoized sorting function for better performance
  const sortProducts = useMemo(() => {
    return (personalizedProducts: SwipeProduct[]) => {
      // Pre-generate random values to avoid recalculation during sort
      const productsWithRandomScore = personalizedProducts.map(product => {
        // Ensure images are properly processed for swipe mode
        const imageUrls = product.image_urls || [product.image_url || '/placeholder.svg'];
        console.log('Enhanced swipe product images for sorting:', product.id, 'URLs:', imageUrls);
        
        return {
          ...product,
          image_urls: imageUrls,
          image_url: imageUrls[0] || '/placeholder.svg',
          sortScore: (product.personalization_score || 0.5) * 0.7 + Math.random() * 0.3
        };
      });
      
      return productsWithRandomScore
        .sort((a, b) => b.sortScore - a.sortScore)
        .map(({ sortScore, ...product }) => product); // Remove temp sort score
    };
  }, []);

  // Apply personalization when products change
  useEffect(() => {
    if (rawProducts) {
      getPersonalizedProducts(rawProducts).then(personalizedProducts => {
        const sortedProducts = sortProducts(personalizedProducts);
        setProducts(sortedProducts);
      });
    }
  }, [rawProducts, getPersonalizedProducts, sortProducts]);

  return {
    products,
    isLoading,
    refetch
  };
};