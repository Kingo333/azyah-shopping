import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { Pin, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WardrobeLayerCarouselProps {
  layer: WardrobeLayer;
  items: WardrobeItem[];
  selectedItemId: string | null;
  onItemSelect: (itemId: string) => void;
  onPinToggle: () => void;
  onRemoveLayer: () => void;
  onAddItem?: () => void;
}

export const WardrobeLayerCarousel: React.FC<WardrobeLayerCarouselProps> = ({
  layer,
  items,
  selectedItemId,
  onItemSelect,
  onPinToggle,
  onRemoveLayer,
  onAddItem,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [centerItemId, setCenterItemId] = useState<string | null>(selectedItemId);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dresses',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  };

  // Auto-scroll to selected item on mount
  useEffect(() => {
    if (selectedItemId && scrollContainerRef.current && isMobile) {
      const selectedCard = scrollContainerRef.current.querySelector(
        `[data-item-id="${selectedItemId}"]`
      ) as HTMLElement;
      
      if (selectedCard) {
        selectedCard.scrollIntoView({ 
          behavior: 'smooth', 
          inline: 'center', 
          block: 'nearest' 
        });
      }
    }
  }, [selectedItemId, isMobile]);

  // Detect center item on scroll (debounced)
  const detectCenterItem = useCallback(() => {
    if (!scrollContainerRef.current || layer.is_pinned || !isMobile) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestItem: { id: string; distance: number } | null = null;

    container.querySelectorAll('[data-item-id]').forEach((card) => {
      const cardElement = card as HTMLElement;
      const cardRect = cardElement.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);

      if (!closestItem || distance < closestItem.distance) {
        closestItem = {
          id: cardElement.dataset.itemId!,
          distance,
        };
      }
    });

    if (closestItem && closestItem.id !== centerItemId) {
      setCenterItemId(closestItem.id);
      onItemSelect(closestItem.id);
    }
  }, [centerItemId, onItemSelect, layer.is_pinned, isMobile]);

  // Debounced scroll handler
  useEffect(() => {
    if (!isMobile) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(detectCenterItem, 150);
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('scrollend', detectCenterItem);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scrollend', detectCenterItem);
      clearTimeout(timeoutId);
    };
  }, [detectCenterItem, isMobile]);

  // Calculate card width (58vw for mobile)
  const cardWidth = isMobile && typeof window !== 'undefined' ? window.innerWidth * 0.58 : 280;

  if (!isMobile) {
    // Desktop: keep existing vertical list (not implemented - return simple view)
    return (
      <div className="layer-rail mb-4 rounded-2xl overflow-hidden border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold capitalize">
              {categoryLabels[layer.category] || layer.category}
            </h3>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPinToggle}>
              <Pin className={cn('w-4 h-4', layer.is_pinned && 'fill-primary text-primary')} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemoveLayer}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Desktop view - {items.length} items</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "layer-rail mb-4 rounded-2xl overflow-hidden transition-all border",
        layer.is_pinned && "bg-primary/5 border-primary/30 shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold capitalize">
            {categoryLabels[layer.category] || layer.category}
          </h3>
          <span className="text-xs text-muted-foreground">
            {items.length}
          </span>
          {layer.is_pinned && (
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-medium">
              <Lock className="w-3 h-3" />
              Pinned
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPinToggle}
            title={layer.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin
              className={cn(
                'w-4 h-4',
                layer.is_pinned && 'fill-primary text-primary'
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={onRemoveLayer}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Carousel Body */}
      <div className="relative">
        {items.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 'clamp(220px, 28vh, 260px)' }}
          >
            <button
              onClick={onAddItem}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-primary transition-colors"
            >
              <p className="text-sm text-muted-foreground">
                Add {categoryLabels[layer.category]}
              </p>
            </button>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className={cn(
              'rail-carousel overflow-x-auto overflow-y-hidden',
              layer.is_pinned && 'pointer-events-none opacity-75'
            )}
            style={{
              height: 'clamp(220px, 28vh, 260px)',
              scrollSnapType: 'x mandatory',
              scrollPadding: '24px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="flex items-center px-[21vw]" style={{ minWidth: '100%' }}>
              {items.map((item) => {
                const isCenter = item.id === (centerItemId || selectedItemId);

                return (
                  <div
                    key={item.id}
                    data-item-id={item.id}
                    className={cn(
                      'rail-card flex-shrink-0 mx-2 transition-all duration-300',
                      isCenter ? 'scale-100 opacity-100' : 'scale-85 opacity-70'
                    )}
                    style={{
                      scrollSnapAlign: 'center',
                      width: `${cardWidth}px`,
                      height: '100%',
                    }}
                  >
                    <div
                      className={cn(
                        'relative h-full rounded-2xl overflow-hidden bg-white',
                        isCenter && 'shadow-xl ring-2 ring-primary/20'
                      )}
                    >
                      <img
                        src={item.image_bg_removed_url || item.image_url}
                        alt={item.category}
                        className="w-full h-full object-contain p-2"
                        loading="lazy"
                        draggable={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
