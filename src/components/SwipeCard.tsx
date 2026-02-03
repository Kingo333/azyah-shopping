import React, { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Info, Image, Sparkles, ShoppingBag, Shirt } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { Money } from '@/components/ui/Money';
import { SwipeActionBar } from '@/components/SwipeActionBar';

import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { getBrandDisplayName } from '@/utils/brandHelpers';
import { cn } from '@/lib/utils';

import { openExternalUrl } from '@/lib/openExternalUrl';

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
  brand?: { name: string; logo_url?: string };
  brands?: { name: string; logo_url?: string };
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
  matchReason?: string; // "Why this" reason for the recommendation
  onLike: (product: SwipeProduct) => void;
  onDislike: () => void;
  onWishlist: (product: SwipeProduct) => void;
  onProductClick: (product: SwipeProduct) => void;
  onTryOn?: (product: SwipeProduct) => void;
  onImageLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  wishlistLoading: boolean;
  motionProps: any;
  showHint?: boolean; // Show instruction hint on first card
}

// Helper to get brand logo URL
const getBrandLogoUrl = (product: SwipeProduct): string | undefined => {
  return product.brand?.logo_url || product.brands?.logo_url;
};

const SwipeCard = memo(({
  product,
  matchReason,
  onLike,
  onDislike,
  onWishlist,
  onProductClick,
  onTryOn,
  onImageLoad,
  wishlistLoading,
  motionProps,
  showHint = false
}: SwipeCardProps) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleBrandClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to brand page - use brand slug or brand_id
    const brandSlug = product.brand?.name?.toLowerCase().replace(/\s+/g, '-') || product.brand_id;
    if (brandSlug) {
      navigate(`/brand/${brandSlug}`);
    }
  }, [navigate, product.brand, product.brand_id]);

  const handleShopNow = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openExternalUrl(product.external_url);
  }, [product.external_url]);

  const handleImageLoadInternal = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoaded(true);
    onImageLoad?.(e);
  };

  return (
    <motion.div
      className="absolute inset-x-2 top-2 bottom-4 flex items-center justify-center"
      {...motionProps}
    >
      <Card className="w-full h-full max-w-md mx-auto rounded-3xl overflow-hidden border-0 shadow-2xl shadow-black/10 bg-card flex flex-col">
        {/* Main image container with overlay action bar */}
        <div className="relative flex-1 min-h-0 bg-gradient-to-br from-muted/30 to-background">
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

          {/* Top badges row - all aligned at top */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
            {/* LEFT: Image count + AR badges */}
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

            {/* RIGHT: Try-On + Info buttons - stacked vertically */}
            <div className="flex flex-col items-end gap-2">
              {/* Virtual Try-On button */}
              {onTryOn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTryOn(product);
                  }}
                  className="h-auto px-2.5 py-1.5 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 shadow-lg opacity-80 hover:opacity-100 flex items-center gap-1.5 transition-all"
                  title="Virtual Try-On"
                >
                  <Shirt className="h-3.5 w-3.5" strokeWidth={2} />
                  <span className="text-[10px] font-medium">Try On</span>
                </Button>
              )}
              
              {/* Info button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onProductClick(product);
                }}
                className="h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
              >
                <Info className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            </div>
          </div>

          {/* Small instruction hint - same line as Closet button, centered */}
          {showHint && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm">
                <span className="text-[9px] text-white/80 font-medium">← Pass • Like →</span>
              </div>
            </div>
          )}


          {/* Bottom overlay - product info + action bar */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            {/* Product info */}
            <div className="px-5 pt-6 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Brand name with logo - above product title - clickable */}
                  <div 
                    className="flex items-center gap-1.5 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleBrandClick}
                  >
                    {getBrandLogoUrl(product) && (
                      <img 
                        src={getBrandLogoUrl(product)} 
                        alt={getBrandDisplayName(product)}
                        className="w-4 h-4 rounded-full object-cover bg-white/20"
                      />
                    )}
                    <p className="text-xs font-semibold text-white/90 uppercase tracking-wide line-clamp-1 underline-offset-2 hover:underline">
                      {getBrandDisplayName(product)}
                    </p>
                  </div>
                  {/* Product title */}
                  <h3 className="text-base font-medium text-white line-clamp-2 leading-tight">
                    {product.title}
                  </h3>
                </div>
                
                {/* Price + Shop area */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Shop button - next to price */}
                  {product.external_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleShopNow}
                      className="h-8 px-3 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground text-[11px] font-semibold shadow-lg"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1" strokeWidth={2} />
                      Shop
                    </Button>
                  )}
                  {/* Price badge - same height as Shop button */}
                  <Badge 
                    className="h-8 px-3 flex items-center rounded-full bg-white/95 text-foreground backdrop-blur-sm shadow-lg border-0"
                  >
                    <Money 
                      cents={product.price_cents} 
                      currency={product.currency || 'USD'} 
                      className="font-semibold text-[11px]"
                    />
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Bottom action bar - Pass/Save/Like (no Shop) */}
            <div className="px-4 pb-4">
              <SwipeActionBar
                variant="card"
                onDislike={onDislike}
                onWishlist={() => onWishlist(product)}
                onLike={() => onLike(product)}
                wishlistLoading={wishlistLoading}
                className="mx-auto max-w-sm"
              />
            </div>
          </div>

        </div>
      </Card>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

export default SwipeCard;
