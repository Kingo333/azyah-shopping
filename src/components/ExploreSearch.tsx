import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Package, Tag, Sparkles, TrendingUp, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';

interface SearchResult {
  type: 'user' | 'product' | 'brand' | 'retailer' | 'style' | 'trend';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  badge?: string;
  productCount?: number;
  data?: any;
}

interface ExploreSearchProps {
  initialQuery?: string;
  onResultClick?: (result: SearchResult) => void;
}

const ExploreSearch: React.FC<ExploreSearchProps> = ({ 
  initialQuery = '', 
  onResultClick 
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'trends' | 'users' | 'products' | 'brands' | 'styles'>('all');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { isEnabled } = useFeatureFlags();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['explore-search', debouncedQuery, activeTab],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];

      const results: SearchResult[] = [];

      // Search trends (based on popular search terms, categories, and user activity)
      if (activeTab === 'all' || activeTab === 'trends') {
        // Get trending categories based on swipes and likes
        const { data: trendingCategories } = await supabase.rpc('get_trending_categories', {
          days_back: 7,
          limit_count: 5
        });
        
        if (trendingCategories) {
          trendingCategories.forEach((trend: any) => {
            const trendName = `${trend.subcategory_slug} ${trend.category_slug}`.replace(/-/g, ' ');
            if (trendName.toLowerCase().includes(debouncedQuery.toLowerCase())) {
              results.push({
                type: 'trend',
                id: `trend-${trend.category_slug}-${trend.subcategory_slug}`,
                title: trendName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                subtitle: `Trending now • ${trend.swipe_count} interactions`,
                badge: `+${trend.growth_percentage}%`,
                data: {
                  category: trend.category_slug,
                  subcategory: trend.subcategory_slug,
                  swipeCount: trend.swipe_count,
                  growth: trend.growth_percentage
                }
              });
            }
          });
        }
      }

      // Search users (using public view for safe fields only)
      if (activeTab === 'all' || activeTab === 'users') {
        const { data: users } = await supabase
          .from('users_public')
          .select('id, name, username, avatar_url')
          .or(`name.ilike.%${debouncedQuery}%,username.ilike.%${debouncedQuery}%`)
          .limit(10);

        users?.forEach(user => {
          results.push({
            type: 'user',
            id: user.id,
            title: user.name || user.username || 'User',
            subtitle: `@${user.username || 'anonymous'}`,
            image: user.avatar_url,
            badge: undefined,
            data: user
          });
        });
      }

      // Search products
      if (activeTab === 'all' || activeTab === 'products') {
        let productQuery = supabase
          .from('products')
          .select(`
            id,
            title,
            price_cents,
            currency,
            media_urls,
            category_slug,
            subcategory_slug,
            is_external,
            source,
            brands (name, logo_url)
          `)
          .eq('status', 'active')
          .ilike('title', `%${debouncedQuery}%`);

        // Apply same external product filtering as swipe hook
        const axessoImportEnabled = isEnabled('axessoImport');
        const axessoImportBulkEnabled = isEnabled('axessoImportBulk');
        
        if (!axessoImportEnabled && !axessoImportBulkEnabled) {
          productQuery = productQuery.eq('is_external', false);
        } else {
          const allowedSources = [];
          if (axessoImportEnabled) allowedSources.push('ASOS_AXESSO', 'axesso-async');
          if (axessoImportBulkEnabled) allowedSources.push('ASOS_AXESSO_BULK');
          
          if (allowedSources.length > 0) {
            productQuery = productQuery.or(`is_external.eq.false,source.in.(${allowedSources.join(',')})`);
          }
        }

        const { data: products } = await productQuery.limit(10);

        products?.forEach(product => {
          results.push({
            type: 'product',
            id: product.id,
            title: product.title,
            subtitle: `${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: product.currency || 'USD'
            }).format(product.price_cents / 100)} • ${product.brands?.name || ''}`,
            image: product.media_urls?.[0],
            badge: product.category_slug,
            data: product
          });
        });
      }

      // Search brands and retailers with product counts
      if (activeTab === 'all' || activeTab === 'brands') {
        // Search brands
        const { data: brands } = await supabase
          .from('brands')
          .select('id, name, slug, logo_url, bio')
          .or(`name.ilike.%${debouncedQuery}%,bio.ilike.%${debouncedQuery}%`)
          .limit(10);

        if (brands) {
          // Get product counts for each brand
          for (const brand of brands) {
            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('brand_id', brand.id)
              .eq('status', 'active');

            results.push({
              type: 'brand',
              id: brand.id,
              title: brand.name,
              subtitle: `${count || 0} products • ${brand.bio || 'Fashion brand'}`,
              image: brand.logo_url,
              badge: 'Brand',
              productCount: count || 0,
              data: { ...brand, productCount: count || 0 }
            });
          }
        }

        // Search retailers
        const { data: retailers } = await supabase
          .from('retailers')
          .select('id, name, slug, logo_url, bio')
          .or(`name.ilike.%${debouncedQuery}%,bio.ilike.%${debouncedQuery}%`)
          .limit(10);

        if (retailers) {
          // Get product counts for each retailer
          for (const retailer of retailers) {
            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('retailer_id', retailer.id)
              .eq('status', 'active');

            results.push({
              type: 'retailer',
              id: retailer.id,
              title: retailer.name,
              subtitle: `${count || 0} products • ${retailer.bio || 'Fashion retailer'}`,
              image: retailer.logo_url,
              badge: 'Retailer',
              productCount: count || 0,
              data: { ...retailer, productCount: count || 0 }
            });
          }
        }
      }

      // Search styles (categories/subcategories)
      if (activeTab === 'all' || activeTab === 'styles') {
        const { data: categories } = await supabase
          .from('products')
          .select('category_slug, subcategory_slug')
          .eq('status', 'active')
          .or(`category_slug.ilike.%${debouncedQuery}%,subcategory_slug.ilike.%${debouncedQuery}%`);

        const styleMap = new Map<string, { category: string; subcategory: string; count: number }>();
        
        categories?.forEach(cat => {
          const key = `${cat.category_slug}-${cat.subcategory_slug}`;
          if (styleMap.has(key)) {
            styleMap.get(key)!.count += 1;
          } else {
            styleMap.set(key, {
              category: cat.category_slug,
              subcategory: cat.subcategory_slug || cat.category_slug,
              count: 1
            });
          }
        });

        Array.from(styleMap.values()).slice(0, 10).forEach(style => {
          const formattedName = style.subcategory !== style.category 
            ? `${style.subcategory.replace(/-/g, ' ')} ${style.category.replace(/-/g, ' ')}`
            : style.category.replace(/-/g, ' ');
            
          results.push({
            type: 'style',
            id: `${style.category}-${style.subcategory}`,
            title: formattedName.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            subtitle: `${style.count} products available`,
            badge: 'Style',
            data: style
          });
        });
      }

      return results;
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2
  });

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
      return;
    }

    switch (result.type) {
      case 'trend':
        navigate('/swipe', { 
          state: { 
            category: result.data.category, 
            subcategory: result.data.subcategory 
          } 
        });
        break;
      case 'user':
        navigate(`/profile/${result.id}`);
        break;
      case 'product':
        // Could navigate to product detail or add to modal
        console.log('Product clicked:', result);
        break;
      case 'brand':
        // Navigate to products page filtered by brand
        navigate('/explore', { 
          state: { 
            brandId: result.id,
            brandName: result.title,
            showProducts: true
          } 
        });
        break;
      case 'retailer':
        // Navigate to products page filtered by retailer
        navigate('/explore', { 
          state: { 
            retailerId: result.id,
            retailerName: result.title,
            showProducts: true
          } 
        });
        break;
      case 'style':
        navigate('/swipe', { 
          state: { 
            category: result.data.category, 
            subcategory: result.data.subcategory 
          } 
        });
        break;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'product': return <Package className="h-4 w-4" />;
      case 'brand': return <Sparkles className="h-4 w-4" />;
      case 'retailer': return <Store className="h-4 w-4" />;
      case 'style': return <Tag className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const filteredResults = searchResults?.filter(result => {
    if (activeTab === 'all') return true;
    if (activeTab === 'trends') return result.type === 'trend';
    if (activeTab === 'users') return result.type === 'user';
    if (activeTab === 'products') return result.type === 'product';
    if (activeTab === 'brands') return result.type === 'brand' || result.type === 'retailer';
    if (activeTab === 'styles') return result.type === 'style';
    return false;
  }) || [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search trends, users, styles, products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {debouncedQuery && debouncedQuery.length >= 2 && (
        <>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="brands">Brands</TabsTrigger>
              <TabsTrigger value="styles">Styles</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded mb-1"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="space-y-2">
                  {filteredResults.map((result) => (
                    <Card 
                      key={`${result.type}-${result.id}`}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleResultClick(result)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center">
                            {result.image ? (
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={result.image} />
                                <AvatarFallback>{result.title[0]}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                {getResultIcon(result.type)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{result.title}</p>
                              {result.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search terms or browse our featured content below.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ExploreSearch;