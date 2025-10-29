import React, { useRef, useState, useEffect } from 'react';
import { Pin, X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';

interface WardrobeLayerCarouselProps {
  layer: WardrobeLayer;
  items: WardrobeItem[];
  selectedItemId?: string | null;
  onItemClick: (itemId: string) => void;
  onPinToggle: () => void;
  onRemoveLayer: () => void;
  onAddItem?: () => void;
}

export const WardrobeLayerCarousel: React.FC<WardrobeLayerCarouselProps> = ({
  layer,
  items,
  selectedItemId,
  onItemClick,
  onPinToggle,
  onRemoveLayer,
  onAddItem,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [centeredIndex, setCenteredIndex] = useState<number>(0);
  
  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dresses',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  };

  // Scroll to selected item using native scrollIntoView
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0 || !selectedItemId) return;

    const itemIndex = items.findIndex(item => item.id === selectedItemId);
    if (itemIndex === -1) return;

    const card = rail.children[itemIndex] as HTMLElement;
    if (card) {
      card.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'center'
      });
      setCenteredIndex(itemIndex);
    }
  }, [selectedItemId, items]);

  // Detect which card is centered during manual scroll
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    const handleScroll = () => {
      const railRect = rail.getBoundingClientRect();
      const centerX = railRect.left + railRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      Array.from(rail.children).forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(cardCenterX - centerX);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== centeredIndex) {
        setCenteredIndex(closestIndex);
      }
    };

    let timeoutId: number;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleScroll, 100);
    };

    rail.addEventListener('scroll', debouncedScroll, { passive: true });
    handleScroll();

    return () => {
      rail.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [items.length, centeredIndex]);

  const visualCenterId = selectedItemId || items[centeredIndex]?.id || items[0]?.id;

  return (
    <div className="mb-0">
      {/* Header with Category Circle */}
      <div className="flex items-center justify-between px-2 mb-1">
        {/* Category Circle Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-xs font-bold text-primary uppercase">
              {layer.category[0]}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground capitalize">
              {categoryLabels[layer.category] || layer.category}
            </h3>
            <span className="text-[10px] text-muted-foreground/60">
              {items.length}
            </span>
            {layer.is_pinned && (
              <div className="flex items-center gap-0.5 text-xs text-primary">
                <Pin className="w-3 h-3 fill-primary" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onPinToggle}
            title={layer.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={layer.is_pinned ? 'w-3 h-3 fill-primary text-primary' : 'w-3 h-3'} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={onRemoveLayer}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
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
          className="rail-carousel"
          data-item-count={items.length}
          style={{
            height: 'clamp(180px, 24vh, 240px)',
          }}
        >
            {items.map((item, index) => {
              const isCenter = index === centeredIndex || item.id === selectedItemId;

              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  className={isCenter ? 'rail-card is-center' : 'rail-card'}
                  onClick={() => onItemClick(item.id)}
                >
                  {/* Pin icon on item */}
                  {layer.is_pinned && isCenter && (
                    <div className="absolute top-2 right-2 z-10">
                      <Pin className="w-4 h-4 fill-primary text-primary drop-shadow" />
                    </div>
                  )}
                  
                  {/* Image */}
                  <img
                    src={item.image_bg_removed_url || item.image_url}
                    alt={item.category}
                    loading="lazy"
                    draggable={false}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
