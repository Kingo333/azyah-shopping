import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Heart, ShoppingBag, ExternalLink, Info, Image, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { useProductHasOutfit } from '@/hooks/useProductOutfits';
import { isImageLoaded, markImageLoaded } from '@/utils/imageLoadedCache';
import { useImagePreloader } from '@/hooks/useImagePreloader';

interface ProductCardProps {
  product: any;
  onDragStart: (product: any, e: React.DragEvent) => void;
  onAddToBoard?: (product: any) => void;
  onLike?: (product: any) => void;
  onWishlist?: (product: any) => void;
  onInfo?: (product: any) => void;
  onTryOn?: (product: any) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onDragStart,
  onAddToBoard,
  onLike,
  onWishlist,
  onInfo,
  onTryOn
}) => {
  const [showPlusButton, setShowPlusButton] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const isMobile = useIsMobile();
  const { isImagePreloaded } = useImagePreloader();
  
  // Check if product has outfit for try-on
  const { data: hasOutfit } = useProductHasOutfit(product.id);
  
  // Get image URL and check cache/preload status
  const imageUrl = getPrimaryImageUrl(product);
  const isImageCached = isImageLoaded(imageUrl) || isImagePreloaded(imageUrl);

  const formatPrice = (priceCents: number, currency: string) => {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };


  const handleTouchStart = useCallback(() => {
    if (isMobile && onAddToBoard) {
      const timer = setTimeout(() => {
        setShowPlusButton(true);
      }, 500); // Show plus button after 500ms hold
      setPressTimer(timer);
    }
  }, [isMobile, onAddToBoard]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToBoard) {
      onAddToBoard(product);
      setShowPlusButton(false);
    }
  }, [onAddToBoard, product]);

  const handleShopNow = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check multiple possible external URL properties for different product sources
    const externalUrl = product.external_url || 
                       product.product?.external_url || 
                       product.external_link ||
                       product.product?.external_link;
    
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('No external URL found for product:', product);
    }
  }, [product]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLike) onLike(product);
  }, [onLike, product]);

  const handleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWishlist) onWishlist(product);
  }, [onWishlist, product]);

  const handleInfo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onInfo) onInfo(product);
  }, [onInfo, product]);

  const handleTryOn = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTryOn) onTryOn(product);
  }, [onTryOn, product]);

  const handleImageLoad = useCallback(() => {
    markImageLoaded(imageUrl);
    setImageLoadError(false);
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    setImageLoadError(true);
  }, []);

  return (
    <div 
      className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-grab active:cursor-grabbing"
      draggable={!isMobile}
      onDragStart={(e) => onDragStart(product, e)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={() => setShowPlusButton(false)}
    >
      <div className="aspect-[3/4] bg-muted rounded-2xl overflow-hidden relative">
        {!isImageCached && !imageLoadError && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10">
            <div className="text-muted-foreground text-xs">Loading...</div>
          </div>
        )}
        <img 
          src={imageLoadError ? '/placeholder.svg' : imageUrl} 
          alt={product.title}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={isImageCached ? "eager" : "lazy"}
        />
        
        {/* Multiple images indicator for ASOS products */}
        {hasMultipleImages(product) && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-90">
            <Image className="h-3 w-3" />
            {getImageCount(product)}
          </div>
        )}
        
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top-right action buttons */}
        <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {onLike && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
              onClick={handleLike}
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}
          {onWishlist && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
              onClick={handleWishlist}
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          )}
          {/* Remove try-on button from here - only in list view */}
        </div>
        
        {/* Mobile add button (shows on long press) */}
        {showPlusButton && onAddToBoard && isMobile && (
          <Button
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
            onClick={handleAddClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        
        {/* Product Info Overlay (appears on hover) */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-sm font-medium line-clamp-1 mb-1">
            {product.brands?.name || product.brand?.name || product.brand_name || product.merchant_name || product.retailer?.name || 'ASOS'}
          </div>
          <div className="text-xs font-semibold text-primary mb-2">
            {formatPrice(product.price_cents, product.currency)}
          </div>
          
          {/* Action buttons row */}
          <div className="flex space-x-2">
            {onAddToBoard && !isMobile && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-7"
                onClick={handleAddClick}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 text-xs h-7"
              onClick={handleShopNow}
              disabled={!(product.external_url || product.product?.external_url || product.external_link || product.product?.external_link)}
            >
              Shop
            </Button>
            {onInfo && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 rounded-full bg-primary/10"
                onClick={handleInfo}
              >
                <Info className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};