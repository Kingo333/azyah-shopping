import { useState } from 'react';
import { Product } from '@/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useOptimizedImage } from '@/hooks/useOptimizedImage';
import { getOptimalImageDimensions } from '@/utils/imageOptimizer';
import { Loader2 } from 'lucide-react';

interface SwipeCardProps {
  product: Product;
}

export const SwipeCard = ({ product }: SwipeCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Get the primary image URL
  const primaryImageUrl = product.image_url || 
    (product.media_urls && Array.isArray(product.media_urls) && product.media_urls.length > 0 
      ? product.media_urls[0] 
      : '/placeholder.svg');

  // Get optimal dimensions for swipe cards
  const optimalDimensions = getOptimalImageDimensions('swipe');
  
  // Use image optimization hook
  const { src: optimizedUrl, isOptimizing, cached } = useOptimizedImage({
    originalUrl: primaryImageUrl,
    targetWidth: optimalDimensions.width,
    targetHeight: optimalDimensions.height,
    quality: optimalDimensions.quality,
    enabled: true
  });

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load:', optimizedUrl);
    (e.target as HTMLImageElement).src = '/placeholder.svg';
    setImageLoaded(true);
  };

  const formatPrice = (priceCents: number, currency: string) => {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  return (
    <Card className="aspect-[3/4] w-full max-w-sm mx-auto relative overflow-hidden bg-card border-border/50 shadow-lg">
      <div className="absolute inset-0">
        {/* Loading state for image optimization */}
        {(isOptimizing || !imageLoaded) && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isOptimizing ? 'Optimizing image...' : 'Loading...'}
              </span>
              {cached && (
                <span className="text-xs text-primary">Cached ✓</span>
              )}
            </div>
          </div>
        )}
        
        {/* Optimized image */}
        <img
          src={optimizedUrl}
          alt={product.title}
          className="w-full h-full object-cover"
          draggable={false}
          style={{
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
          }}
          sizes="(max-width: 768px) 100vw, 50vw"
          loading="eager"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Product information overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {product.category_slug || 'Fashion'}
              </Badge>
              {product.price_cents && (
                <span className="text-lg font-bold">
                  {formatPrice(product.price_cents, product.currency || 'USD')}
                </span>
              )}
            </div>
            
            <h3 className="text-sm font-medium line-clamp-2 leading-tight">
              {product.title}
            </h3>
            
            {product.merchant_name && (
              <p className="text-xs text-white/80">
                {product.merchant_name}
              </p>
            )}
          </div>
        </div>

        {/* Quality indicator */}
        {optimizedUrl !== primaryImageUrl && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-green-500/20 text-green-100 border-green-300/30 text-xs">
              HD ✓
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};