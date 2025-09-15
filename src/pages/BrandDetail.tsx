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
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';

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

        {/* Products Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">All Products</h2>
          
          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const imageUrl = getPrimaryImageUrl(product);

                return (
                  <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                    <div className="aspect-square overflow-hidden rounded-t-lg">
                      <SmartImage
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-primary">
                          {formatPrice(product.price_cents, product.currency)}
                        </p>
                        {product.external_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <a href={product.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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