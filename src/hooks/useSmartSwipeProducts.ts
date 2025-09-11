import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { convertJsonToProductAttributes } from '@/lib/type-utils';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { getFeatureFlag } from '@/lib/features';
import { optimizeImageUrls } from '@/utils/imageOptimizer';

// Stable feature flag function outside component to prevent re-creation
const getFeatureFlagSafe = (flag: 'axessoImport' | 'axessoImportBulk'): boolean => {
  try {
    // This will be null outside provider context, we handle it in the component
    return getFeatureFlag(flag);
  } catch (error) {
    console.warn(`Feature flag fallback for ${flag}`);
    return getFeatureFlag(flag);
  }
};

interface UseSmartSwipeProductsProps {
  filter: string;
  subcategory?: string;
  gender?: string;
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
  gender,
  priceRange,
  searchQuery,
  currency = 'USD'
}: UseSmartSwipeProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Stable feature flag access - try context first, fallback to direct
  const getContextualFeatureFlag = useCallback((flag: 'axessoImport' | 'axessoImportBulk'): boolean => {
    try {
      const { isEnabled } = useFeatureFlags();
      return isEnabled(flag);
    } catch (error) {
      // Context not available, use stable fallback
      return getFeatureFlagSafe(flag);
    }
  }, []);
  
  // Stable memoized config for consistent dependencies
  const stableConfig = useMemo(() => ({
    filter,
    subcategory,
    gender,
    priceRange: { min: priceRange.min, max: priceRange.max },
    searchQuery: searchQuery?.trim() || '',
    currency
  }), [filter, subcategory, gender, priceRange.min, priceRange.max, searchQuery, currency]);

  const analyzeUserPreferences = useCallback(async (userId: string): Promise<UserPreferences> => {
    try {
      console.log('🔍 Analyzing user preferences for user:', userId);
      
      // First get the likes
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('product_id')
        .eq('user_id', userId)
        .limit(100);

      if (likesError) {
        console.error('❌ Error fetching likes:', likesError);
        return {
          categories: {},
          brands: {},
          priceRanges: {},
          tags: {},
          totalLikes: 0
        };
      }

      console.log('📝 Found likes:', likes?.length || 0);

      if (!likes || likes.length === 0) {
        return {
          categories: {},
          brands: {},
          priceRanges: {},
          tags: {},
          totalLikes: 0
        };
      }

      // Get product details for liked products
      const productIds = likes.map(like => like.product_id);
      const { data: likedProducts, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          category_slug,
          subcategory_slug,
          price_cents,
          currency,
          tags,
          brand:brands(name)
        `)
        .in('id', productIds);

      if (productsError) {
        console.error('❌ Error fetching liked products:', productsError);
        return {
          categories: {},
          brands: {},
          priceRanges: {},
          tags: {},
          totalLikes: 0
        };
      }

      console.log('📦 Found liked products:', likedProducts?.length || 0);
    

      const preferences: UserPreferences = {
        categories: {},
        brands: {},
        priceRanges: {},
        tags: {},
        totalLikes: likedProducts?.length || 0
      };

      likedProducts?.forEach((product: any) => {
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

      console.log('✅ User preferences analyzed:', {
        categories: Object.keys(preferences.categories).length,
        brands: Object.keys(preferences.brands).length,
        totalLikes: preferences.totalLikes
      });

      return preferences;
    } catch (error) {
      console.error('❌ Error in analyzeUserPreferences:', error);
      return {
        categories: {},
        brands: {},
        priceRanges: {},
        tags: {},
        totalLikes: 0
      };
    }
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
      // Enhanced debugging for domain-specific issues
      const currentUrl = window.location.origin;
      const isDirect = currentUrl.includes('klwolsopucgswhtdlsps.supabase.co');
      const isProxy = currentUrl.includes('api.azyahstyle.com');
      
      console.log('🌐 DOMAIN DEBUG:', {
        currentUrl,
        isDirect,
        isProxy,
        env_VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        env_PROD: import.meta.env.PROD,
        env_DEV: import.meta.env.DEV
      });
      
      // Check authentication status first
      const { data: { user } } = await supabase.auth.getUser();
      
      // For anonymous users, use minimal public data query
      if (!user) {
        console.log('🔒 Anonymous user - fetching public product data');
        
        let anonymousQuery = supabase
          .from('products')
          .select(`
            id,
            title,
            price_cents,
            currency,
            media_urls,
            external_url,
            category_slug,
            subcategory_slug,
            is_external,
            source,
            brand:brands(name, logo_url)
          `)
          .eq('status', 'active');

        // Apply the same feature flag logic for anonymous users with fallbacks
        const axessoImportEnabled = getContextualFeatureFlag('axessoImport');
        const axessoImportBulkEnabled = getContextualFeatureFlag('axessoImportBulk');
        
        console.log('🔍 ANONYMOUS DEBUG - Domain:', currentUrl);
        console.log('🔍 ANONYMOUS DEBUG - Feature flags:', { 
          axessoImportEnabled, 
          axessoImportBulkEnabled,
          featureSource: 'safe-fallback'
        });
        
        if (!axessoImportEnabled && !axessoImportBulkEnabled) {
          anonymousQuery = anonymousQuery.eq('is_external', false);
          console.log('❌ External products disabled for anonymous users');
        } else {
          const allowedSources = [];
          if (axessoImportEnabled) allowedSources.push('axesso-async');
          if (axessoImportBulkEnabled) allowedSources.push('ASOS_AXESSO_BULK');
          
          console.log('✅ Anonymous allowed sources:', allowedSources);
          
          if (allowedSources.length > 0) {
            const conditions = ['is_external.eq.false'];
            allowedSources.forEach(source => {
              conditions.push(`and(is_external.eq.true,source.eq.${source})`);
            });
            anonymousQuery = anonymousQuery.or(conditions.join(','));
            console.log('🔍 Anonymous query conditions:', conditions.join(','));
          }
        }

        anonymousQuery = anonymousQuery.limit(50);
        
        const { data, error } = await anonymousQuery;

        if (error) {
          console.error('❌ ANONYMOUS QUERY ERROR - Domain:', currentUrl, 'Error:', error);
          throw error;
        }
        
        console.log('📦 ANONYMOUS QUERY SUCCESS - Domain:', currentUrl, 'Products fetched:', data?.length);

        // Transform minimal data for anonymous users
        const anonymousProducts: Product[] = (data || []).map(item => ({
          id: item.id,
          title: item.title,
          description: '',
          price_cents: item.price_cents,
          compare_at_price_cents: null,
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
                mediaUrls = [];
              }
            }
            return optimizeImageUrls(mediaUrls, 'swipe');
          })(),
          external_url: item.external_url,
          ar_mesh_url: null,
          brand_id: '',
          retailer_id: null,
          sku: '',
          category_slug: item.category_slug,
          subcategory_slug: item.subcategory_slug,
          status: 'active',
          stock_qty: 0,
          min_stock_alert: 5,
          weight_grams: null,
          dimensions: undefined,
          tags: [],
          seo_title: null,
          seo_description: null,
          created_at: '',
          updated_at: '',
          brand: item.brand ? {
            id: '',
            name: item.brand.name || 'Unknown',
            slug: '',
            logo_url: item.brand.logo_url,
            cover_image_url: null,
            bio: '',
            website: '',
            socials: {},
            shipping_regions: [],
            contact_email: null,
            owner_user_id: null,
            created_at: '',
            updated_at: ''
          } : undefined,
          attributes: {}
        }));

        console.log('✅ Anonymous products loaded:', anonymousProducts.length);
        setProducts(shuffleArray(anonymousProducts));
        return;
      }

      // Authenticated user - full product query
      console.log('🔓 Authenticated user - fetching full product data');
      
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
          brand:brands(
            id, 
            name, 
            slug, 
            logo_url, 
            bio, 
            website, 
            created_at, 
            updated_at, 
            socials, 
            shipping_regions, 
            cover_image_url
          ),
          attributes
        `).eq('status', 'active');

      // Handle external products based on feature flags with fallbacks
      const axessoImportEnabled = getContextualFeatureFlag('axessoImport');
      const axessoImportBulkEnabled = getContextualFeatureFlag('axessoImportBulk');
      
      console.log('🔍 AUTHENTICATED DEBUG - Domain:', currentUrl);
      console.log('🔍 AUTHENTICATED DEBUG - Feature flags:', { 
        axessoImportEnabled, 
        axessoImportBulkEnabled,
        featureSource: 'safe-fallback'
      });
      
      if (!axessoImportEnabled && !axessoImportBulkEnabled) {
        query = query.eq('is_external', false);
        console.log('❌ External products disabled by feature flags');
      } else {
        const allowedSources = [];
        if (axessoImportEnabled) allowedSources.push('axesso-async');
        if (axessoImportBulkEnabled) allowedSources.push('ASOS_AXESSO_BULK');
        
        console.log('✅ Allowed sources:', allowedSources);
        
        if (allowedSources.length > 0) {
          // Create a more explicit OR condition for internal OR external products
          const conditions = ['is_external.eq.false'];
          allowedSources.forEach(source => {
            conditions.push(`and(is_external.eq.true,source.eq.${source})`);
          });
          query = query.or(conditions.join(','));
          console.log('🔍 Query conditions:', conditions.join(','));
        }
      }

      // Apply filters
      if (subcategory && subcategory !== '') {
        query = query.eq('subcategory_slug', subcategory as any);
      } else if (filter && filter !== 'all') {
        // Handle the special case for filtering miscategorized products (same logic as usePersonalizedProducts)
        if (filter === 'footwear') {
          // Include both properly categorized footwear AND miscategorized shoes in "clothing"
          query = query.or('category_slug.eq.footwear,and(category_slug.eq.clothing,or(title.ilike.%shoe%,title.ilike.%sneaker%,title.ilike.%boot%,title.ilike.%sandal%,title.ilike.%heel%,title.ilike.%flat%,title.ilike.%trainer%,title.ilike.%loafer%,title.ilike.%slipper%))');
        } else if (filter === 'bags') {
          // Include both properly categorized bags AND miscategorized bags in "clothing"
          query = query.or('category_slug.eq.bags,and(category_slug.eq.clothing,or(title.ilike.%bag%,title.ilike.%handbag%,title.ilike.%purse%,title.ilike.%clutch%,title.ilike.%tote%,title.ilike.%backpack%,title.ilike.%wallet%))');
        } else if (filter === 'accessories') {
          // Include both properly categorized accessories AND miscategorized accessories in "clothing"
          query = query.or('category_slug.eq.accessories,and(category_slug.eq.clothing,or(title.ilike.%belt%,title.ilike.%scarf%,title.ilike.%hat%,title.ilike.%sunglasses%,title.ilike.%watch%,title.ilike.%hair%))');
        } else if (filter === 'jewelry') {
          // Include both properly categorized jewelry AND miscategorized jewelry in "clothing"
          query = query.or('category_slug.eq.jewelry,and(category_slug.eq.clothing,or(title.ilike.%jewelry%,title.ilike.%necklace%,title.ilike.%earring%,title.ilike.%bracelet%,title.ilike.%ring%))');
        } else {
          // For other categories, use direct filtering
          query = query.eq('category_slug', filter as any);
        }
      }

      // Apply gender filter - check both gender column and attributes.gender_target
      if (gender && gender !== '') {
        query = query.or(`gender.eq.${gender},attributes->>gender_target.eq.${gender}`);
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
      if (error) {
        console.error('❌ QUERY ERROR - Domain:', currentUrl, 'Error:', error);
        throw error;
      }

      console.log('📦 QUERY SUCCESS - Domain:', currentUrl, 'Products fetched:', data?.length);
      
      // Count internal vs external products
      const internalCount = data?.filter(p => !p.is_external).length || 0;
      const externalCount = data?.filter(p => p.is_external).length || 0;
      const asosCount = data?.filter(p => p.source === 'axesso-async').length || 0;
      
      console.log('📊 Product breakdown:', {
        total: data?.length || 0,
        internal: internalCount,
        external: externalCount,
        asos: asosCount
      });
      
      console.log('📦 Sample products:', data?.slice(0, 5).map(p => ({ 
        title: p.title?.substring(0, 30) + '...', 
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
          // Optimize image URLs for swipe display
          return optimizeImageUrls(mediaUrls, 'swipe');
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
          contact_email: null, // Protected - use authenticated endpoint for contact info
          shipping_regions: item.brand.shipping_regions,
          owner_user_id: null, // Protected - not exposed in public API
          created_at: item.brand.created_at,
          updated_at: item.brand.updated_at
        } : undefined,
        attributes: convertJsonToProductAttributes(item.attributes)
      }));

      console.log('🔄 Processing products for authenticated user personalization...');
      
      if (user && transformedProducts.length > 0) {
        console.log('👤 Processing for authenticated user:', user.id);
        
        // Analyze user preferences
        const preferences = await analyzeUserPreferences(user.id);

        if (preferences.totalLikes > 0) {
          console.log('🎯 User has preferences, applying 60/40 personalization');
          
          // Calculate scores for all products
          const productsWithScores = transformedProducts.map(product => ({
            product,
            score: calculatePersonalizationScore(product, preferences)
          }));

          // Sort by personalization score
          productsWithScores.sort((a, b) => b.score - a.score);

          // Implement 60/40 strategy
          const totalProducts = Math.min(100, productsWithScores.length);
          const personalizedCount = Math.floor(totalProducts * 0.6);
          const randomCount = totalProducts - personalizedCount;

          console.log('📊 Personalization split:', {
            total: totalProducts,
            personalized: personalizedCount,
            random: randomCount
          });

          // Get top 60% personalized products
          const personalizedProducts = productsWithScores
            .slice(0, personalizedCount)
            .map(item => item.product);

          // Get random 40% from remaining products
          const remainingProducts = productsWithScores
            .slice(personalizedCount)
            .map(item => item.product);
          const randomProducts = shuffleArray(remainingProducts).slice(0, randomCount);

          // Combine and shuffle the final list
          const finalProducts = shuffleArray([...personalizedProducts, ...randomProducts]);
          
          console.log('✅ Final products prepared:', {
            total: finalProducts.length,
            internal: finalProducts.filter(p => !p.brand?.name?.includes('ASOS')).length,
            asos: finalProducts.filter(p => p.brand?.name?.includes('ASOS')).length
          });
          
          setProducts(finalProducts);
        } else {
          console.log('🆕 New user - showing random products');
          const randomProducts = shuffleArray(transformedProducts).slice(0, 50);
          console.log('✅ Random products for new user:', {
            total: randomProducts.length,
            internal: randomProducts.filter(p => !p.brand?.name?.includes('ASOS')).length,
            asos: randomProducts.filter(p => p.brand?.name?.includes('ASOS')).length
          });
          setProducts(randomProducts);
        }
      } else {
        console.log('🔒 No user or no products - showing random selection');
        const randomProducts = shuffleArray(transformedProducts).slice(0, 50);
        console.log('✅ Random products for authenticated user without preferences:', {
          total: randomProducts.length,
          internal: randomProducts.filter(p => !p.brand?.name?.includes('ASOS')).length,
          asos: randomProducts.filter(p => p.brand?.name?.includes('ASOS')).length
        });
        setProducts(randomProducts);
      }

    } catch (error: any) {
      console.error("Error fetching smart swipe products:", error);
      
      // Don't show error toasts for anonymous users - provide fallback
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('🔄 Anonymous error fallback - showing empty state');
          setProducts([]);
        } else {
          // More specific error handling for authenticated users
          if (error.message?.includes('Failed to fetch') || error.code === 'PGRST301') {
            console.log('Network/RLS error - may be connection issue');
            toast({
              title: "Connection Error",
              description: "Unable to load products. Please check your connection.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to fetch products. Please try again.",
              variant: "destructive"
            });
          }
          setProducts([]);
        }
      } catch (authError) {
        console.log('🔄 Auth check failed - treating as anonymous');
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [stableConfig, toast, getContextualFeatureFlag, analyzeUserPreferences, calculatePersonalizationScore, shuffleArray]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    refetch: fetchProducts
  };
};