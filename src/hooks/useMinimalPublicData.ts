import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MinimalBrandData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface MinimalRetailerData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface MinimalProductData {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  category_slug: string;
  image_url: string | null;
  brand_name: string | null;
}

interface MinimalCategoryData {
  slug: string;
  name: string;
}

/**
 * Hook for fetching minimal brand directory (safe for anonymous users)
 * Returns only essential info: name, slug, logo - no business details
 */
export const useMinimalBrandDirectory = () => {
  return useQuery({
    queryKey: ['minimal-brand-directory'],
    queryFn: async (): Promise<MinimalBrandData[]> => {
      const { data, error } = await supabase.rpc('get_minimal_brand_directory');

      if (error) {
        console.error('Failed to fetch minimal brand directory:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};

/**
 * Hook for fetching minimal retailer directory (safe for anonymous users)
 * Returns only essential info: name, slug, logo - no business details
 */
export const useMinimalRetailerDirectory = () => {
  return useQuery({
    queryKey: ['minimal-retailer-directory'],
    queryFn: async (): Promise<MinimalRetailerData[]> => {
      const { data, error } = await supabase.rpc('get_minimal_retailer_directory');

      if (error) {
        console.error('Failed to fetch minimal retailer directory:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};

/**
 * Hook for fetching minimal product catalog (safe for anonymous users)
 * Returns basic product info without business intelligence or engagement metrics
 */
export const useMinimalProductCatalog = (
  limit = 20,
  offset = 0
) => {
  return useQuery({
    queryKey: ['minimal-product-catalog', limit, offset],
    queryFn: async (): Promise<MinimalProductData[]> => {
      const { data, error } = await supabase.rpc('get_minimal_product_catalog', {
        limit_param: limit,
        offset_param: offset
      });

      if (error) {
        console.error('Failed to fetch minimal product catalog:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};

/**
 * Hook for fetching minimal category list (safe for anonymous users)
 * Returns category names only - no business metrics or product counts
 */
export const useMinimalCategoryList = () => {
  return useQuery({
    queryKey: ['minimal-category-list'],
    queryFn: async (): Promise<MinimalCategoryData[]> => {
      const { data, error } = await supabase.rpc('get_minimal_category_list');

      if (error) {
        console.error('Failed to fetch minimal category list:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};