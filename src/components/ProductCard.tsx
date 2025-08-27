import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Heart, ShoppingBag, ExternalLink, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductCardProps {
  product: any;
  onDragStart: (product: any, e: React.DragEvent) => void;
  onAddToBoard?: (product: any) => void;
  onLike?: (product: any) => void;
  onWishlist?: (product: any) => void;
  onInfo?: (product: any) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onDragStart,
  onAddToBoard,
  onLike,
  onWishlist,
  onInfo
}) => {
  const [showPlusButton, setShowPlusButton] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  const formatPrice = (priceCents: number, currency: string) => {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const getImageUrl = (item: any) => {
    // Handle different data structures for images
    if (item.image_url) return item.image_url;
    
    // Handle media_urls as array
    if (item.media_urls && Array.isArray(item.media_urls) && item.media_urls.length > 0) {
      return item.media_urls[0];
    }
    
    // Handle media_urls as JSON string (ASOS products)
    if (item.media_urls && typeof item.media_urls === 'string') {
      try {
        const parsed = JSON.parse(item.media_urls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0];
        }
      } catch (e) {
        console.warn('Failed to parse media_urls:', item.media_urls);
      }
    }
    
    // Handle product nested structure from likes
    if (item.product?.media_urls && Array.isArray(item.product.media_urls) && item.product.media_urls.length > 0) {
      return item.product.media_urls[0];
    }
    
    // Handle products table direct access
    if (item.products?.media_urls && Array.isArray(item.products.media_urls) && item.products.media_urls.length > 0) {
      return item.products.media_urls[0];
    }
    
    return '/placeholder.svg';
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
    if (product.external_url) {
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    }
  }, [product.external_url]);

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
        <img 
          src={getImageUrl(product)} 
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
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
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-sm font-medium line-clamp-1 mb-1">
            {product.brands?.name || product.brand?.name || product.brand_name || product.merchant_name || 'Unknown Brand'}
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
              disabled={!product.external_url}
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