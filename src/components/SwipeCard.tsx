import React, { memo, useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Info, Image, Sparkles } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { SwipeActionBar } from '@/components/SwipeActionBar';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { getBrandDisplayName } from '@/utils/brandHelpers';
import { cn } from '@/lib/utils';

interface SwipeProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  category_slug: string;
  subcategory_slug?: string;
  image_url?: string;
  media_urls?: any;
  brand_id?: string;
  brand?: { name: string };
  brands?: { name: string };
  retailer?: { name: string };
  tags?: string[];
  attributes?: any;
  is_external?: boolean;
  external_url?: string;
  merchant_name?: string;
  ar_mesh_url?: string;
}

interface SwipeCardProps {
  product: SwipeProduct;
  onLike: (product: SwipeProduct) => void;
  onDislike: () => void;
  onWishlist: (product: SwipeProduct) => void;
  onProductClick: (product: SwipeProduct) => void;
  onImageLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  wishlistLoading: boolean;
  motionProps: any;
}

const SwipeCard = memo(({
  product,
  onLike,
  onDislike,
  onWishlist,
  onProductClick,
  onImageLoad,
  wishlistLoading,
  motionProps
}: SwipeCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleShopNow = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.external_url) {
      try {
        const url = product.external_url.startsWith('http') 
          ? product.external_url 
          : `https://${product.external_url}`;
        
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          window.location.href = url;
        }
      } catch (error) {
        console.warn('Failed to open product page');
      }
    }
  }, [product.external_url]);

  const handleImageLoadInternal = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoaded(true);
    onImageLoad?.(e);
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      {...motionProps}
    >
      <Card className="w-full max-w-md mx-auto rounded-3xl overflow-hidden border-0 shadow-2xl shadow-black/10 bg-card">
        {/* Main image container with aspect ratio */}
        <div className="relative w-full aspect-[9/16] bg-gradient-to-br from-muted/30 to-background">
          {/* Image with blur-up effect */}
          <div className={cn(
            "absolute inset-0 transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}>
            <SmartImage
              src={getPrimaryImageUrl(product)}
              alt={product.title}
              className="w-full h-full object-cover"
              sizes="(max-width: 768px) 100vw, 448px"
              onLoad={handleImageLoadInternal}
            />
          </div>
          
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted animate-pulse" />
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              {/* Image count badge */}
              {hasMultipleImages(product) && (
                <Badge 
                  variant="secondary" 
                  className="gap-1.5 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border-0"
                >
                  <Image className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span className="font-semibold">{getImageCount(product)}</span>
                </Badge>
              )}
              
              {/* AR badge */}
              {product.ar_mesh_url && (
                <Badge 
                  variant="secondary"
                  className="gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground backdrop-blur-sm shadow-lg shadow-primary/20 border-0 animate-glow-pulse"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="font-semibold text-xs">AR</span>
                </Badge>
              )}
            </div>

            {/* Info button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onProductClick(product);
              }}
              className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
            >
              <Info className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>

          {/* Bottom content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10 space-y-4">
            {/* Product info */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight">
                    {product.title}
                  </h3>
                  <p className="text-sm text-white/80 line-clamp-1 mt-0.5">
                    {getBrandDisplayName(product)}
                  </p>
                </div>
                
                {/* Price badge */}
                <Badge 
                  className="px-3 py-1.5 rounded-full bg-white/95 text-foreground backdrop-blur-sm shadow-lg border-0 shrink-0"
                >
                  <span className="font-bold text-base">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: product.currency || 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(product.price_cents / 100)}
                  </span>
                </Badge>
              </div>
            </div>

            {/* Action buttons */}
            <SwipeActionBar
              onLike={() => onLike(product)}
              onDislike={onDislike}
              onWishlist={() => onWishlist(product)}
              onShopNow={product.external_url ? handleShopNow : undefined}
              wishlistLoading={wishlistLoading}
              hasExternalUrl={!!product.external_url}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

export default SwipeCard;
