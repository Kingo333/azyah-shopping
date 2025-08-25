import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useWishlistProducts } from '@/hooks/useWishlistProducts';
import { useProducts } from '@/hooks/useProducts';
import { Palette, Heart, ShoppingBag, Plus } from 'lucide-react';
import { MoodBoardBuilder } from '@/components/MoodBoardBuilder';

interface CreateLookSectionProps {
  closetId?: string;
}

export const CreateLookSection: React.FC<CreateLookSectionProps> = ({ closetId }) => {
  const { wishlistProducts, isLoading: wishlistLoading } = useWishlistProducts();
  const { data: products, isLoading: productsLoading } = useProducts({ limit: 50 });

  const formatPrice = (priceCents: number, currency: string) => {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const getImageUrl = (item: any) => {
    if (item.image_url) return item.image_url;
    if (item.media_urls && Array.isArray(item.media_urls) && item.media_urls.length > 0) {
      return item.media_urls[0];
    }
    if (item.product?.media_urls && Array.isArray(item.product.media_urls) && item.product.media_urls.length > 0) {
      return item.product.media_urls[0];
    }
    return '/placeholder.svg';
  };

  if (!closetId) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
        <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Create a closet first to start creating looks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Mood Board Builder - Always visible */}
      <div className="bg-card rounded-lg border">
        <MoodBoardBuilder
          closetId={closetId}
          onClose={() => {}} // No close button since it's embedded
        />
      </div>

      {/* Wishlist Carousel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">From Your Wishlist</h3>
          <Badge variant="secondary">{wishlistProducts.length}</Badge>
        </div>
        
        {wishlistLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-48 h-64 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : wishlistProducts.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {wishlistProducts.map((item) => (
                <CarouselItem key={item.id} className="pl-2 basis-48">
                  <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                      <img 
                        src={getImageUrl(item.product)} 
                        alt={item.product?.title || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">
                        {item.product?.title || 'Untitled'}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.product?.brand_id || 'Unknown Brand'}
                      </p>
                      <p className="font-semibold text-sm">
                        {formatPrice(item.product?.price_cents || 0, item.product?.currency || 'USD')}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No items in your wishlist yet</p>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          <h3 className="text-lg font-semibold">All Products</h3>
          <Badge variant="secondary">{products?.length || 0}</Badge>
        </div>
        
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                  <img 
                    src={getImageUrl(product)} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-2">
                  <h4 className="font-medium text-xs line-clamp-2 mb-1">
                    {product.title}
                  </h4>
                  <p className="font-semibold text-xs">
                    {formatPrice(product.price_cents, product.currency)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No products available</p>
          </div>
        )}
      </div>
    </div>
  );
};