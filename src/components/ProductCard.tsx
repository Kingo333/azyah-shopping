import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductCardProps {
  product: any;
  onDragStart: (product: any, e: React.DragEvent) => void;
  onAddToBoard?: (product: any) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onDragStart,
  onAddToBoard
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
    if (item.image_url) return item.image_url;
    if (item.media_urls && Array.isArray(item.media_urls) && item.media_urls.length > 0) {
      return item.media_urls[0];
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

  return (
    <Card 
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative"
      draggable={!isMobile}
      onDragStart={(e) => onDragStart(product, e)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={() => setShowPlusButton(false)}
    >
      <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
        <img 
          src={getImageUrl(product)} 
          alt={product.title}
          className="w-full h-full object-cover"
        />
        {showPlusButton && onAddToBoard && (
          <Button
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-primary/90 hover:bg-primary backdrop-blur-sm"
            onClick={handleAddClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
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
  );
};