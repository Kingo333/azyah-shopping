import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrendingStyle {
  category: string;
  subcategory: string;
  count: number;
  growth: number;
  recent_products: Array<{
    id: string;
    title: string;
    media_urls: any;
    price_cents: number;
    currency: string;
  }>;
}

interface TrendingStylesProps {
  limit?: number;
  showMore?: boolean;
}

const TrendingStyles: React.FC<TrendingStylesProps> = ({ limit = 6, showMore = true }) => {
  const navigate = useNavigate();

  const { data: trendingStyles, isLoading } = useQuery({
    queryKey: ['trending-styles', limit],
    queryFn: async () => {
      // Get popular categories from recent swipes and likes
      const { data: categoryData, error: categoryError } = await supabase
        .from('swipes')
        .select(`
          product_id,
          created_at,
          action,
          products!inner (
            category_slug,
            subcategory_slug,
            title,
            media_urls,
            price_cents,
            currency
          )
        `)
        .eq('action', 'right')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (categoryError) throw categoryError;

      // Process data to get trending categories
      const categoryMap = new Map<string, TrendingStyle>();
      
      categoryData?.forEach((swipe) => {
        const product = swipe.products;
        const key = `${product.category_slug}-${product.subcategory_slug}`;
        
        if (categoryMap.has(key)) {
          const existing = categoryMap.get(key)!;
          existing.count += 1;
          if (existing.recent_products.length < 3) {
            existing.recent_products.push({
              id: swipe.product_id,
              title: product.title,
              media_urls: product.media_urls,
              price_cents: product.price_cents,
              currency: product.currency
            });
          }
        } else {
          categoryMap.set(key, {
            category: product.category_slug,
            subcategory: product.subcategory_slug || product.category_slug,
            count: 1,
            growth: Math.floor(Math.random() * 50) + 10, // Simulated growth %
            recent_products: [{
              id: swipe.product_id,
              title: product.title,
              media_urls: product.media_urls,
              price_cents: product.price_cents,
              currency: product.currency
            }]
          });
        }
      });

      return Array.from(categoryMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    }
  });

  const formatCategoryName = (category: string, subcategory?: string) => {
    const formatted = subcategory && subcategory !== category 
      ? `${subcategory.replace(/-/g, ' ')} ${category.replace(/-/g, ' ')}`
      : category.replace(/-/g, ' ');
    
    return formatted.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded mb-4"></div>
              <div className="flex gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-16 h-16 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trendingStyles?.map((style, index) => (
          <Card 
            key={`${style.category}-${style.subcategory}`}
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/swipe', { 
              state: { 
                category: style.category, 
                subcategory: style.subcategory 
              } 
            })}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={index < 3 ? "default" : "secondary"} className="text-xs">
                  #{index + 1}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  +{style.growth}%
                </div>
              </div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {formatCategoryName(style.category, style.subcategory)}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="flex gap-2 mb-3">
                {style.recent_products.slice(0, 3).map((product) => (
                  <div key={product.id} className="relative group/product">
                    <img
                      src={product.media_urls?.[0] || '/placeholder.svg'}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/product:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                      <Button
                        size="sm"
                        className="text-xs py-1 px-2 h-auto bg-primary hover:bg-primary-glow"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to external product page - will implement proper link
                          window.open(`/product/${product.id}`, '_blank');
                        }}
                      >
                        Buy Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {style.count} likes this week
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
                
                {/* Price range for trending products */}
                {style.recent_products.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      From {formatPrice(Math.min(...style.recent_products.map(p => p.price_cents)))}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs py-0 px-2 hover:bg-primary hover:text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/swipe', { 
                          state: { 
                            category: style.category, 
                            subcategory: style.subcategory 
                          } 
                        });
                      }}
                    >
                      Shop Style
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showMore && trendingStyles && trendingStyles.length > 0 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/trending-styles')}
            className="hover:bg-primary hover:text-primary-foreground"
          >
            View All Trending Styles
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TrendingStyles;