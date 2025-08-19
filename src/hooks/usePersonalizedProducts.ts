import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { convertJsonToProductAttributes } from '@/lib/type-utils';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { optimizeImageUrls } from '@/utils/imageOptimizer';

interface UsePersonalizedProductsProps {
  filter: string;
  subcategory?: string;
  gender?: string;
  priceRange: {
    min: number;
    max: number;
  };
  searchQuery?: string;
  currency?: string;
}

export const usePersonalizedProducts = ({
  filter,
  subcategory,
  gender,
  priceRange,
  searchQuery,
  currency = 'USD'
}: UsePersonalizedProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isEnabled } = useFeatureFlags();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('products').select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          ar_mesh_url,
          brand_id,
          sku,
          category_slug,
          subcategory_slug,
          status,
          stock_qty,
          min_stock_alert,
          created_at,
          updated_at,
          description,
          compare_at_price_cents,
          weight_grams,
          dimensions,
          tags,
          seo_title,
          seo_description,
          retailer_id,
          is_external,
          source,
          source_vendor,
          source_imported_at,
          brand:brands!inner(
            id, 
            name, 
            slug, 
            logo_url, 
            bio, 
            website, 
            owner_user_id, 
            created_at, 
            updated_at, 
            socials, 
            contact_email, 
            shipping_regions, 
            cover_image_url
          ),
          attributes
        `).eq('status', 'active');

      // Handle external products based on feature flags
      const axessoImportEnabled = isEnabled('axessoImport');
      const axessoImportBulkEnabled = isEnabled('axessoImportBulk');
      
      if (!axessoImportEnabled && !axessoImportBulkEnabled) {
        // Exclude all external products when both flags are disabled
        query = query.eq('is_external', false);
      } else {
        // Include external products from enabled sources
        const allowedSources = [];
        if (axessoImportEnabled) allowedSources.push('ASOS_AXESSO', 'axesso-async');
        if (axessoImportBulkEnabled) allowedSources.push('ASOS_AXESSO_BULK');
        
        if (allowedSources.length > 0) {
          query = query.or(`is_external.eq.false,source.in.(${allowedSources.join(',')})`);
        }
      }

      // Apply subcategory filter first (more specific)
      if (subcategory && subcategory !== '') {
        query = query.eq('subcategory_slug', subcategory as any);
      }
      // Apply category filter only if no subcategory
      else if (filter && filter !== 'all') {
        // Map new "bags" category to "accessories" for database compatibility
        const dbCategory = filter === 'bags' ? 'accessories' : filter;
        query = query.eq('category_slug', dbCategory as any);

        // If bags category is selected, filter by bag subcategories
        if (filter === 'bags') {
          query = query.in('subcategory_slug', ['handbags', 'clutches', 'totes', 'backpacks', 'wallets']);
        }
      }

      // Gender filtering temporarily disabled until database migration is complete
      // TODO: Re-enable after gender column is properly migrated

      // Apply currency filter
      if (currency && currency !== 'USD') {
        query = query.eq('currency', currency);
      }

      // Apply price range filter
      if (priceRange.min > 0) {
        query = query.gte('price_cents', priceRange.min * 100);
      }
      if (priceRange.max < 1000) {
        query = query.lte('price_cents', priceRange.max * 100);
      }

      // Apply search query
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // Order by created_at for consistent results
      query = query.order('created_at', {
        ascending: false
      });
      
      const { data, error } = await query;
      if (error) throw error;

      // Transform the data to match Product type with proper type conversions
      const transformedProducts: Product[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price_cents: item.price_cents,
        compare_at_price_cents: item.compare_at_price_cents,
        currency: item.currency || 'USD',
        media_urls: (() => {
          let mediaUrls: string[] = [];
          if (Array.isArray(item.media_urls)) {
            mediaUrls = item.media_urls as string[];
          } else if (typeof item.media_urls === 'string') {
            try {
              const parsed = JSON.parse(item.media_urls);
              mediaUrls = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn('Failed to parse media_urls for product', item.id, ':', item.media_urls);
              mediaUrls = [];
            }
          }
          // Optimize image URLs for grid display
          return optimizeImageUrls(mediaUrls, 'grid');
        })(),
        external_url: item.external_url,
        ar_mesh_url: item.ar_mesh_url,
        brand_id: item.brand_id || '',
        retailer_id: item.retailer_id,
        sku: item.sku,
        category_slug: item.category_slug,
        subcategory_slug: item.subcategory_slug,
        status: item.status,
        stock_qty: item.stock_qty || 0,
        min_stock_alert: item.min_stock_alert || 5,
        weight_grams: item.weight_grams,
        dimensions: item.dimensions && typeof item.dimensions === 'object' && item.dimensions !== null ? item.dimensions as Record<string, number> : undefined,
        tags: item.tags,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        created_at: item.created_at,
        updated_at: item.updated_at,
        brand: item.brand ? {
          id: item.brand.id,
          name: item.brand.name,
          slug: item.brand.slug,
          logo_url: item.brand.logo_url,
          cover_image_url: item.brand.cover_image_url,
          bio: item.brand.bio,
          socials: item.brand.socials && typeof item.brand.socials === 'object' && item.brand.socials !== null ? item.brand.socials as Record<string, string> : {},
          website: item.brand.website,
          contact_email: item.brand.contact_email,
          shipping_regions: item.brand.shipping_regions,
          owner_user_id: item.brand.owner_user_id,
          created_at: item.brand.created_at,
          updated_at: item.brand.updated_at
        } : undefined,
        attributes: convertJsonToProductAttributes(item.attributes)
      }));

      setProducts(transformedProducts);
    } catch (error: any) {
      console.error("Error fetching products:", error.message);
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter, subcategory, gender, priceRange, searchQuery, currency, toast, isEnabled]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    refetch: fetchProducts
  };
};