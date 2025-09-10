
import React, { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Heart, X, ShoppingBag, Sparkles, Info, Image } from 'lucide-react';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';

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
  imageHeight: number;
  showInstructions: boolean;
  onLike: (product: SwipeProduct) => void;
  onDislike: () => void;
  onWishlist: (product: SwipeProduct) => void;
  onProductClick: (product: SwipeProduct) => void;
  onInstructionsClick: () => void;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  wishlistLoading: boolean;
  motionProps: any;
}

const SwipeCard = memo(({
  product,
  imageHeight,
  showInstructions,
  onLike,
  onDislike,
  onWishlist,
  onProductClick,
  onInstructionsClick,
  onImageLoad,
  wishlistLoading,
  motionProps
}: SwipeCardProps) => {
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

  return (
    <motion.div
      className="absolute -top-8 sm:top-0 left-0 w-full h-full"
      {...motionProps}
    >
      <Card className="h-full flex flex-col cursor-grab active:cursor-grabbing overflow-hidden min-h-[650px] max-w-md mx-auto rounded-3xl shadow-xl shadow-black/10">
        <CardContent className="p-3 pb-2 sm:p-4 lg:pb-5 flex flex-col h-full bg-background/60 backdrop-blur-sm">
          <div 
            className="relative w-full overflow-hidden rounded-2xl flex-shrink-0"
            style={{
              height: `${imageHeight - (window.innerWidth <= 768 ? 15 : 0)}px`,
              maxHeight: `${imageHeight - (window.innerWidth <= 768 ? 15 : 0)}px`,
            }}
            onClick={onInstructionsClick}
          >
            <img
              {...getResponsiveImageProps(
                getPrimaryImageUrl(product),
                "(max-width: 768px) 100vw, 50vw"
              )}
              alt={product.title}
              className="object-contain w-full h-full transition-opacity duration-300 max-h-full"
              onLoad={onImageLoad}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.src = '/placeholder.svg';
              }}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
            />
            
            <div className="absolute top-4 left-4 flex items-center gap-3">
              {hasMultipleImages(product) && (
                <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <Image className="h-3 w-3" />
                  {getImageCount(product)}
                </div>
              )}
              
              {showInstructions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="bg-black/75 text-white text-xs px-2 py-1 rounded-full"
                >
                  ← Pass • ↑ Save • Like →
                </motion.div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col flex-grow space-y-1 mt-1 mx-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold line-clamp-1">{product.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{product.brand?.name || product.brands?.name || product.merchant_name || 'ASOS'}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onProductClick(product);
                }}
                className="flex-shrink-0 h-8 px-2 text-xs hover:bg-accent"
              >
                <Info className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-base sm:text-lg font-bold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: product.currency || 'USD'
                }).format(product.price_cents / 100)}
              </span>
              
              <div className="flex items-center gap-1">
                {product.ar_mesh_url && (
                  <Badge variant="outline" className="gap-1 text-xs mr-2">
                    <Sparkles className="h-3 w-3" />
                    AR Ready
                  </Badge>
                )}
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDislike();
                    }}
                    className="h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWishlist(product);
                    }}
                    disabled={wishlistLoading}
                    className="h-8 w-8 rounded-full bg-accent/10 hover:bg-accent/20"
                  >
                    <ShoppingBag className="h-3 w-3 text-accent-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike(product);
                    }}
                    className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                  >
                    <Heart className="h-3 w-3 text-primary" />
                  </Button>
                </div>
              </div>
            </div>

            {product.external_url && (
              <div className="pt-2 border-t border-border">
                <Button
                  onClick={handleShopNow}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg pointer-events-auto"
                  size="sm"
                >
                  Shop Now
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

export default SwipeCard;
