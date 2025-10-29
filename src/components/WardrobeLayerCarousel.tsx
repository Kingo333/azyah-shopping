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
    if (selectedItemId && scrollContainerRef.current) {
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
  }, [selectedItemId]);

  // Detect center item on scroll (debounced)
  const detectCenterItem = useCallback(() => {
    if (!scrollContainerRef.current || layer.is_pinned) return;

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
  }, [centerItemId, onItemSelect, layer.is_pinned]);

  // Debounced scroll handler
  useEffect(() => {
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
  }, [detectCenterItem]);

  // Calculate card width (60vw for larger images)
  const cardWidth = typeof window !== 'undefined' ? window.innerWidth * 0.60 : 288;

  return (
    <div className="mb-0">
      {/* Minimal Header - just text */}
      <div className="flex items-center justify-between px-2 mb-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground capitalize">
            {categoryLabels[layer.category] || layer.category}
          </h3>
          <span className="text-xs text-muted-foreground/60">
            {items.length}
          </span>
          {layer.is_pinned && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Lock className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPinToggle}
            title={layer.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin
              className={cn(
                'w-3.5 h-3.5',
                layer.is_pinned && 'fill-primary text-primary'
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onRemoveLayer}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Carousel - No box styling */}
      <div className="relative">
        {items.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 'clamp(160px, 20vh, 200px)' }}
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
              layer.is_pinned && 'pointer-events-none'
            )}
            style={{
              height: 'clamp(160px, 20vh, 200px)',
              scrollSnapType: 'x mandatory',
              scrollPadding: '20vw',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="flex items-center px-[20vw]">
              {items.map((item) => {
                const isCenter = item.id === (centerItemId || selectedItemId);

                return (
                  <div
                    key={item.id}
                    data-item-id={item.id}
                    className={cn(
                      'rail-card flex-shrink-0 mx-0 transition-all duration-300 relative',
                      isCenter ? 'scale-100 opacity-100' : 'scale-95 opacity-100'
                    )}
                    style={{
                      scrollSnapAlign: 'center',
                      scrollSnapStop: 'always',
                      width: `${cardWidth}px`,
                      height: '100%',
                    }}
                  >
                    {/* Pin icon on item */}
                    {layer.is_pinned && isCenter && (
                      <div className="absolute top-2 right-2 z-10">
                        <Pin className="w-4 h-4 fill-primary text-primary drop-shadow" />
                      </div>
                    )}
                    
                    {/* Clean image - no box */}
                    <img
                      src={item.image_bg_removed_url || item.image_url}
                      alt={item.category}
                      className={cn(
                        "w-full h-full object-contain transition-all duration-300",
                        isCenter && "drop-shadow-xl"
                      )}
                      loading="lazy"
                      draggable={false}
                    />
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
