import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Package, Heart, Star } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';

const BrandDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['brand', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['brand-products', brand?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brands!inner(name)
        `)
        .eq('brand_id', brand.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!brand?.id,
  });

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  const getImageUrl = (product: any) => {
    // Handle different media_urls formats
    if (product.image_url) {
      return product.image_url;
    }
    
    if (product.media_urls) {
      // If it's a JSON string, parse it
      if (typeof product.media_urls === 'string') {
        try {
          const parsed = JSON.parse(product.media_urls);
          return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          return product.media_urls;
        }
      }
      // If it's already an array
      if (Array.isArray(product.media_urls)) {
        return product.media_urls[0];
      }
    }
    
    return '/placeholder.svg';
  };

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-8"></div>
            <div className="h-32 bg-muted rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container max-w-6xl mx-auto">
          <Button onClick={() => navigate(-1)} variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-muted-foreground">Brand not found</h1>
            <p className="text-muted-foreground mt-2">The brand you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${brand.name} - Luxury Fashion Brand`}
        description={brand.bio || `Discover premium fashion from ${brand.name}. Explore the latest collections and trending styles.`}
        canonical={`https://azyah.app/brand/${brand.slug}`}
      />

      <div className="container max-w-6xl mx-auto p-4">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Explore
        </Button>

        {/* Brand Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={brand.logo_url} />
                <AvatarFallback className="text-2xl">{brand.name[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{brand.name}</h1>
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 mr-1" />
                    Featured Brand
                  </Badge>
                </div>
                
                {brand.bio && (
                  <p className="text-muted-foreground mb-4">{brand.bio}</p>
                )}
                
                <div className="flex items-center gap-4">
                  {brand.website && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={brand.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Website
                      </a>
                    </Button>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    {products?.length || 0} products
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List - Compact Mobile View */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">All Products</h2>
          
          {productsLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-3 p-3 bg-card rounded-lg animate-pulse">
                  <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="space-y-2">
              {products.map((product) => {
                const imageUrl = getImageUrl(product);
                const imageProps = imageUrl.includes('asos-media.com') 
                  ? getResponsiveImageProps(imageUrl, "64px")
                  : { src: imageUrl };

                return (
                  <div 
                    key={product.id} 
                    className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/p/${product.id}`)}
                  >
                    {/* Compact Image */}
                    <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        {...imageProps}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2 text-foreground">
                        {product.title}
                      </h3>
                      <p className="text-sm font-semibold text-primary mt-0.5">
                        {formatPrice(product.price_cents, product.currency)}
                      </p>
                    </div>
                    
                    {/* External Link (optional) */}
                    {product.external_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(product.external_url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Products Yet</h3>
              <p className="text-muted-foreground">This brand hasn't added any products yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandDetail;