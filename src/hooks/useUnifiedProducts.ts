import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Product } from '@/types';

export interface UnifiedProductFilters {
  category?: string;
  subcategory?: string;
  gender?: string;
  priceRange: { min: number; max: number };
  searchQuery?: string;
  currency?: string;
  limit?: number;
  offset?: number;
}

export interface UnifiedProductsResult {
  products: Product[];
  isLoading: boolean;
  refetch: () => void;
}

export const useUnifiedProducts = (filters: UnifiedProductFilters): UnifiedProductsResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    console.log('Fetching products with filters:', filters);
    
    try {
      // Build base query with comprehensive joins
      let query = supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          retailer:retailers(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply filters with sophisticated logic
      if (filters.category && filters.category !== 'all') {
        // Handle category filtering with fallbacks for miscategorized items
        if (filters.category === 'bags') {
          // Bags can be in clothing category too
          query = query.or(`category_slug.eq.bags,and(category_slug.eq.clothing,subcategory_slug.in.(handbags,clutches,totes,backpacks,wallets))`);
        } else if (filters.category === 'footwear') {
          // Shoes might be in clothing category
          query = query.or(`category_slug.eq.footwear,and(category_slug.eq.clothing,subcategory_slug.in.(heels,flats,sandals,sneakers,boots,loafers,slippers))`);
        } else {
          query = query.eq('category_slug', filters.category as any);
        }
      }

      // Subcategory takes precedence over category
      if (filters.subcategory) {
        query = query.eq('subcategory_slug', filters.subcategory as any);
      }

      // Gender filtering with fallbacks - include null gender when no specific gender selected
      if (filters.gender && filters.gender !== 'all') {
        // Check both direct gender column and attributes fallback, plus null values
        query = query.or(`gender.eq.${filters.gender},attributes->gender_target.eq."${filters.gender}",gender.is.null`);
      }

      // Price range filtering
      if (filters.priceRange.min > 0) {
        query = query.gte('price_cents', filters.priceRange.min * 100);
      }
      if (filters.priceRange.max < 10000) {
        query = query.lte('price_cents', filters.priceRange.max * 100);
      }

      // Currency filtering
      if (filters.currency && filters.currency !== 'USD') {
        query = query.eq('currency', filters.currency);
      }

      // Search filtering across title and brand
      if (filters.searchQuery) {
        const searchTerm = filters.searchQuery.trim();
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
      }

      // Apply pagination
      if (filters.limit) {
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + filters.limit - 1);
        } else {
          query = query.limit(filters.limit);
        }
      }

      const { data, error } = await query;

      console.log('Query result:', { data: data?.length, error });

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error fetching products",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Transform raw data to Product type with proper type handling
      let processedProducts: Product[] = (data || []).map((product: any) => {
        // Safely handle image_url and media_urls
        let imageUrl = '/placeholder.svg';
        let mediaUrls: string[] = [];
        
        if (typeof product.image_url === 'string') {
          imageUrl = product.image_url;
        } else if (product.media_urls) {
          if (typeof product.media_urls === 'string') {
            try {
              mediaUrls = JSON.parse(product.media_urls);
              imageUrl = mediaUrls[0] || '/placeholder.svg';
            } catch (e) {
              console.warn('Failed to parse media_urls:', e);
            }
          } else if (Array.isArray(product.media_urls)) {
            mediaUrls = product.media_urls.map((url: any) => String(url));
            imageUrl = mediaUrls[0] || '/placeholder.svg';
          }
        }
        
        // Transform to Product type
        return {
          ...product,
          image_url: imageUrl,
          media_urls: mediaUrls,
          // Ensure proper type conversion
          gender: product.gender || null,
          attributes: (product.attributes && typeof product.attributes === 'object') 
            ? product.attributes 
            : {}
        } as Product;
      });

      // Apply personalization if user is authenticated
      if (user?.id && processedProducts.length > 0) {
        const productIds = processedProducts.map(p => p.id);
        
        try {
          const { data: personalizationData } = await supabase
            .rpc('get_personalized_product_scores', {
              target_user_id: user.id,
              product_ids: productIds
            });

          if (personalizationData) {
            // Merge personalization scores and sort
            processedProducts = processedProducts.map(product => {
              const personalization = personalizationData.find(p => p.product_id === product.id);
              return {
                ...product,
                _personalization_score: personalization?.personalization_score || 0.5
              } as Product;
            });

            // Sort by personalization with some randomization
            processedProducts.sort((a, b) => {
              const aScore = ((a as any)._personalization_score || 0.5) + (Math.random() * 0.2 - 0.1);
              const bScore = ((b as any)._personalization_score || 0.5) + (Math.random() * 0.2 - 0.1);
              return bScore - aScore;
            });
          }
        } catch (personalizationError) {
          console.warn('Personalization failed, using default order:', personalizationError);
        }
      }

      console.log('Setting products:', processedProducts.length);
      setProducts(processedProducts);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      toast({
        title: "Error loading products",
        description: "Failed to load products. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.category,
    filters.subcategory, 
    filters.gender,
    filters.priceRange.min,
    filters.priceRange.max,
    filters.currency,
    filters.searchQuery,
    filters.limit,
    filters.offset,
    user?.id
  ]);

  const refetch = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, refetch };
};