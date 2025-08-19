import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { convertJsonToProductAttributes } from '@/lib/type-utils';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';

interface UseSmartSwipeProductsProps {
  filter: string;
  subcategory: string;
  priceRange: {
    min: number;
    max: number;
  };
  searchQuery: string;
  currency?: string;
}

interface UserPreferences {
  categories: Record<string, number>;
  brands: Record<string, number>;
  priceRanges: Record<string, number>;
  tags: Record<string, number>;
  totalLikes: number;
}

export const useSmartSwipeProducts = ({
  filter,
  subcategory,
  priceRange,
  searchQuery,
  currency = 'USD'
}: UseSmartSwipeProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isEnabled } = useFeatureFlags();

  const analyzeUserPreferences = useCallback(async (userId: string): Promise<UserPreferences> => {
    // Fetch user's liked products to understand preferences
    const { data: likedProducts, error } = await supabase
      .from('likes')
      .select(`
        product_id,
        products(
          category_slug,
          subcategory_slug,
          price_cents,
          currency,
          tags,
          brand:brands(name)
        )
      `)
      .eq('user_id', userId)
      .limit(100); // Analyze last 100 likes

    if (error) {
      console.error('Error fetching user preferences:', error);
      return {
        categories: {},
        brands: {},
        priceRanges: {},
        tags: {},
        totalLikes: 0
      };
    }

    const preferences: UserPreferences = {
      categories: {},
      brands: {},
      priceRanges: {},
      tags: {},
      totalLikes: likedProducts?.length || 0
    };

    likedProducts?.forEach((like: any) => {
      const product = like.products;
      if (!product) return;

      // Analyze categories
      const category = product.category_slug;
      if (category) {
        preferences.categories[category] = (preferences.categories[category] || 0) + 1;
      }

      // Analyze brands
      const brandName = product.brand?.name;
      if (brandName) {
        preferences.brands[brandName] = (preferences.brands[brandName] || 0) + 1;
      }

      // Analyze price ranges
      const price = product.price_cents / 100;
      const priceRange = price < 50 ? 'low' : price < 200 ? 'medium' : 'high';
      preferences.priceRanges[priceRange] = (preferences.priceRanges[priceRange] || 0) + 1;

      // Analyze tags
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach((tag: string) => {
          if (tag) {
            preferences.tags[tag] = (preferences.tags[tag] || 0) + 1;
          }
        });
      }
    });

    return preferences;
  }, []);

  const calculatePersonalizationScore = useCallback((product: Product, preferences: UserPreferences): number => {
    let score = 0;
    const totalLikes = preferences.totalLikes;

    if (totalLikes === 0) return 0; // No personalization for new users

    // Category preference (40% weight)
    const categoryScore = preferences.categories[product.category_slug] || 0;
    score += (categoryScore / totalLikes) * 0.4;

    // Brand preference (30% weight)
    const brandScore = preferences.brands[product.brand?.name || ''] || 0;
    score += (brandScore / totalLikes) * 0.3;

    // Price range preference (20% weight)
    const price = product.price_cents / 100;
    const priceRange = price < 50 ? 'low' : price < 200 ? 'medium' : 'high';
    const priceScore = preferences.priceRanges[priceRange] || 0;
    score += (priceScore / totalLikes) * 0.2;

    // Tag preference (10% weight)
    if (product.tags && Array.isArray(product.tags)) {
      let tagScore = 0;
      product.tags.forEach((tag: string) => {
        tagScore += preferences.tags[tag] || 0;
      });
      score += (tagScore / (totalLikes * Math.max(1, product.tags.length))) * 0.1;
    }

    return Math.min(score, 1); // Cap at 1
  }, []);

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

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
      
      console.log('🔍 Feature flags:', { axessoImportEnabled, axessoImportBulkEnabled });
      
      if (!axessoImportEnabled && !axessoImportBulkEnabled) {
        query = query.eq('is_external', false);
        console.log('❌ External products disabled by feature flags');
      } else {
        const allowedSources = [];
        if (axessoImportEnabled) allowedSources.push('ASOS_AXESSO', 'axesso-async');
        if (axessoImportBulkEnabled) allowedSources.push('ASOS_AXESSO_BULK');
        
        console.log('✅ Allowed sources:', allowedSources);
        
        if (allowedSources.length > 0) {
          query = query.or(`is_external.eq.false,source.in.(${allowedSources.join(',')})`);
        }
      }

      // Apply filters
      if (subcategory && subcategory !== '') {
        query = query.eq('subcategory_slug', subcategory as any);
      } else if (filter && filter !== 'all') {
        const dbCategory = filter === 'bags' ? 'accessories' : filter;
        query = query.eq('category_slug', dbCategory as any);

        if (filter === 'bags') {
          query = query.in('subcategory_slug', ['handbags', 'clutches', 'totes', 'backpacks', 'wallets']);
        }
      }

      if (currency && currency !== 'USD') {
        query = query.eq('currency', currency);
      }

      if (priceRange.min > 0) {
        query = query.gte('price_cents', priceRange.min * 100);
      }
      if (priceRange.max < 1000) {
        query = query.lte('price_cents', priceRange.max * 100);
      }

      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // Fetch more products for better randomization
      query = query.limit(200);
      
      const { data, error } = await query;
      if (error) throw error;

      console.log('📦 Raw products fetched:', data?.length);
      console.log('📦 Sample products:', data?.slice(0, 3).map(p => ({ 
        title: p.title, 
        is_external: p.is_external, 
        source: p.source,
        brand: p.brand?.name 
      })));

      // Transform the data
      const transformedProducts: Product[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price_cents: item.price_cents,
        compare_at_price_cents: item.compare_at_price_cents,
        currency: item.currency || 'USD',
        media_urls: Array.isArray(item.media_urls) ? item.media_urls as string[] : [],
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

      // Get current user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && transformedProducts.length > 0) {
        // Analyze user preferences
        const preferences = await analyzeUserPreferences(user.id);

        if (preferences.totalLikes > 0) {
          // Calculate scores for all products
          const productsWithScores = transformedProducts.map(product => ({
            product,
            score: calculatePersonalizationScore(product, preferences)
          }));

          // Sort by personalization score
          productsWithScores.sort((a, b) => b.score - a.score);

          // Implement 70/30 strategy
          const totalProducts = Math.min(100, productsWithScores.length); // Limit to 100 products
          const personalizedCount = Math.floor(totalProducts * 0.7);
          const randomCount = totalProducts - personalizedCount;

          // Get top 70% personalized products
          const personalizedProducts = productsWithScores
            .slice(0, personalizedCount)
            .map(item => item.product);

          // Get random 30% from remaining products
          const remainingProducts = productsWithScores
            .slice(personalizedCount)
            .map(item => item.product);
          const randomProducts = shuffleArray(remainingProducts).slice(0, randomCount);

          // Combine and shuffle the final list
          const finalProducts = shuffleArray([...personalizedProducts, ...randomProducts]);
          setProducts(finalProducts);
        } else {
          // New user - show random products
          setProducts(shuffleArray(transformedProducts).slice(0, 50));
        }
      } else {
        // No user or no products - show random selection
        setProducts(shuffleArray(transformedProducts).slice(0, 50));
      }

    } catch (error: any) {
      console.error("Error fetching smart swipe products:", error.message);
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter, subcategory, priceRange, searchQuery, currency, toast, isEnabled, analyzeUserPreferences, calculatePersonalizationScore, shuffleArray]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    refetch: fetchProducts
  };
};