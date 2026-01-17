import React, { memo, useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Info, Image, Sparkles, Check, X, Star, Heart, ShoppingBag } from 'lucide-react';
import { HangerIcon } from '@/components/icons/HangerIcon';
import { SmartImage } from '@/components/SmartImage';
import { Money } from '@/components/ui/Money';

import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { getBrandDisplayName } from '@/utils/brandHelpers';
import { cn } from '@/lib/utils';
import { useAddProductToWardrobe, checkClosetDuplicate } from '@/hooks/useAddProductToWardrobe';
import { useAuth } from '@/contexts/AuthContext';

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
  matchReason?: string; // "Why this" reason for the recommendation
  onLike: (product: SwipeProduct) => void;
  onDislike: () => void;
  onWishlist: (product: SwipeProduct) => void;
  onProductClick: (product: SwipeProduct) => void;
  onImageLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  wishlistLoading: boolean;
  motionProps: any;
}

// Separate component for Add to Closet button to use hooks
const AddToClosetButton = memo(({ product }: { product: SwipeProduct }) => {
  const { user } = useAuth();
  const { mutate: addToWardrobe, isPending } = useAddProductToWardrobe();
  const [isAdded, setIsAdded] = useState(false);
  
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[Closet] clicked', product?.id, 'user:', !!user);
    
    if (!user) {
      import('sonner').then(({ toast }) => {
        toast.error('Sign in to save to Closet');
      });
      return;
    }
    
    // Check for duplicates first
    const isDuplicate = await checkClosetDuplicate(user.id, product.id);
    if (isDuplicate) {
      import('sonner').then(({ toast }) => {
        toast.info('Already in Closet', {
          description: 'This item is already saved',
          duration: 2000,
        });
      });
      return;
    }
    
    addToWardrobe({ product: product as any, skipDuplicateCheck: true }, {
      onSuccess: () => {
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 1500);
      }
    });
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending || isAdded}
      className={cn(
        "h-auto px-2.5 py-1.5 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 shadow-lg opacity-80 hover:opacity-100 flex items-center gap-1.5 transition-all",
        isAdded && "bg-green-500/80 text-white"
      )}
      title="Add to Closet"
    >
      {isAdded ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="text-xs font-medium">Added</span>
        </>
      ) : (
        <>
          <HangerIcon className="h-3.5 w-3.5" size={14} />
          <span className="text-[10px] font-medium">+ Closet</span>
        </>
      )}
    </Button>
  );
});
AddToClosetButton.displayName = 'AddToClosetButton';

const SwipeCard = memo(({
  product,
  matchReason,
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
    openExternalUrl(product.external_url);
  }, [product.external_url]);

  const handleImageLoadInternal = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoaded(true);
    onImageLoad?.(e);
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-2"
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

            {/* RIGHT: Closet + Info buttons - stacked vertically */}
            <div className="flex flex-col items-end gap-2">
              {/* Add to Closet button on top */}
              <AddToClosetButton product={product} />
              
              {/* Info button below */}
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

          {/* Why This + Tags Section - positioned above product info */}
          <div className="absolute bottom-36 left-4 right-4 z-10 flex flex-wrap gap-1.5">
            {/* Why This chip - always shown */}
            <Badge 
              variant="secondary" 
              className="bg-background/90 backdrop-blur-sm text-[10px] gap-1 px-2 py-0.5 shadow-sm"
            >
              <Sparkles className="h-3 w-3" />
              {matchReason || 'Curated for you'}
            </Badge>
            
            {/* Product tags - show up to 2 */}
            {product.tags?.slice(0, 2).map((tag, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className="bg-background/80 backdrop-blur-sm text-[10px] px-2 py-0.5 border-white/30"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Bottom overlay - product info + action bar (always visible) */}
          <div 
            className="absolute bottom-0 left-0 right-0 z-10"
            style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
          >
            {/* Product info */}
            <div className="px-6 pt-6 pb-3">
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
                    <Money 
                      cents={product.price_cents} 
                      currency={product.currency || 'USD'} 
                      className="font-bold text-base"
                    />
                  </Badge>
                </div>
              </div>
            </div>

            {/* Action bar - part of overlay, always visible */}
            <div className="flex items-center divide-x divide-white/20 bg-background/95 backdrop-blur-sm rounded-b-3xl">
              {/* Pass */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDislike();
                }}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="text-[10px] font-medium">Pass</span>
              </button>
              
              {/* Save */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWishlist(product);
                }}
                disabled={wishlistLoading}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Star className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="text-[10px] font-medium">Save</span>
              </button>
              
              {/* Like */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(product);
                }}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-muted-foreground hover:text-pink-500 hover:bg-pink-50 transition-colors"
              >
                <Heart className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="text-[10px] font-medium">Like</span>
              </button>
              
              {/* Shop */}
              {product.external_url && (
                <button
                  onClick={handleShopNow}
                  className="flex items-center justify-center gap-1 px-3 py-3 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium rounded-br-3xl"
                >
                  <ShoppingBag className="h-4 w-4" strokeWidth={2} />
                  <span className="text-[11px] font-semibold">Shop</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

export default SwipeCard;
