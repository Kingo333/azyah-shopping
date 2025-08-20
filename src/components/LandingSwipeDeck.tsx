
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, ShoppingBag, ExternalLink } from 'lucide-react';
import { useSmartSwipeProducts } from '@/hooks/useSmartSwipeProducts';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';

interface LandingSwipeDeckProps {
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

const LandingSwipeDeck: React.FC<LandingSwipeDeckProps> = ({
  filter,
  subcategory,
  gender,
  priceRange,
  searchQuery,
  currency = 'USD'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { products, isLoading } = useSmartSwipeProducts({
    filter: filter || 'all',
    subcategory,
    gender,
    priceRange,
    searchQuery,
    currency
  });

  console.log('LandingSwipeDeck - Products:', products?.length, 'Loading:', isLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground text-sm">Loading products...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground text-sm mb-4">No products found</p>
        <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
      </div>
    );
  }

  const currentProduct = products[currentIndex];

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, products.length - 1));
  };

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const getImageUrl = (product: any) => {
    try {
      if (product.media_urls) {
        let mediaUrls = product.media_urls;
        if (typeof mediaUrls === 'string') {
          mediaUrls = JSON.parse(mediaUrls);
        }
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
          return mediaUrls[0];
        }
      }
      return product.image_url || '/placeholder.svg';
    } catch (error) {
      console.warn('Error processing image URL:', error);
      return '/placeholder.svg';
    }
  };

  if (!currentProduct) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">No more products</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full">
          {/* Product Image */}
          <div className="relative w-full flex-1 mb-4 overflow-hidden rounded-lg bg-gray-100">
            <img
              {...getResponsiveImageProps(getImageUrl(currentProduct))}
              alt={currentProduct.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== '/placeholder.svg') {
                  img.src = '/placeholder.svg';
                }
              }}
            />
          </div>
          
          {/* Product Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold line-clamp-2">{currentProduct.title}</h3>
              <p className="text-xs text-muted-foreground">
                {currentProduct.brand?.name || currentProduct.brands?.name || 'Brand'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currentProduct.currency || 'USD'
                }).format(currentProduct.price_cents / 100)}
              </span>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentIndex >= products.length - 1}
                  className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                >
                  <Heart className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </div>

            {/* Shop Now Button */}
            {currentProduct.external_url && (
              <Button
                onClick={() => {
                  if (currentProduct.external_url) {
                    window.open(currentProduct.external_url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full gap-2"
                size="sm"
              >
                <ShoppingBag className="h-4 w-4" />
                Shop Now
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Product Counter */}
          <div className="text-center mt-2">
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} of {products.length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LandingSwipeDeck;
