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

  // ✅ EFFECT 1: Scroll to selected item using native scrollIntoView
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    let targetIndex = 0;
    
    if (selectedItemId) {
      const foundIndex = items.findIndex(item => item.id === selectedItemId);
      if (foundIndex !== -1) {
        targetIndex = foundIndex;
      }
    }

    // Scroll the card into center view
    const targetCard = rail.children[targetIndex] as HTMLElement;
    if (targetCard) {
      targetCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      setCenteredIndex(targetIndex);
    }
  }, [selectedItemId, items]);

  // ✅ EFFECT 2: Detect which card is centered during manual scroll
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    let scrollTimeout: number;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      
      // Debounce to wait for scroll to settle
      scrollTimeout = window.setTimeout(() => {
        const railRect = rail.getBoundingClientRect();
        const centerX = railRect.left + railRect.width / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        // Find which card is closest to center
        Array.from(rail.children).forEach((card, index) => {
          const cardRect = card.getBoundingClientRect();
          const cardCenterX = cardRect.left + cardRect.width / 2;
          const distance = Math.abs(cardCenterX - centerX);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        setCenteredIndex(closestIndex);
      }, 150);
    };

    rail.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      rail.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [items]);

  // ✅ EFFECT 3: Handle resize - recenter current item
  useEffect(() => {
    const handleResize = () => {
      const rail = scrollContainerRef.current;
      if (!rail || items.length === 0) return;

      const currentCard = rail.children[centeredIndex] as HTMLElement;
      if (currentCard) {
        currentCard.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'center',
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [centeredIndex, items]);

  // Determine which card is visually centered
  const getCardClasses = (index: number) => {
    return index === centeredIndex ? 'rail-card is-center' : 'rail-card';
  };

  return (
    <div className="mb-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-bold text-primary uppercase">
              {layer.category[0]}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {categoryLabels[layer.category] || layer.category}
            </h3>
            <span className="text-xs text-muted-foreground">
              ({items.length})
            </span>
            {layer.is_pinned && (
              <Pin className="w-4 h-4 fill-primary text-primary ml-1" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPinToggle}
            title={layer.is_pinned ? 'Unpin layer' : 'Pin layer'}
          >
            <Pin className={layer.is_pinned ? 'w-4 h-4 fill-primary text-primary' : 'w-4 h-4'} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemoveLayer}
            title="Remove layer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {items.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 'clamp(180px, 24vh, 240px)' }}
          >
            <button
              onClick={onAddItem}
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl px-8 py-6 hover:border-primary hover:bg-primary/5 transition-all"
            >
              <p className="text-sm text-muted-foreground font-medium">
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
              height: 'clamp(240px, 32vh, 320px)',
            }}
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                data-item-id={item.id}
                className={getCardClasses(index)}
                onClick={() => onItemClick(item.id)}
              >
                {/* Pin indicator on centered item */}
                {layer.is_pinned && index === centeredIndex && (
                  <div className="absolute top-3 right-3 z-20">
                    <div className="bg-primary/90 backdrop-blur-sm rounded-full p-1.5">
                      <Pin className="w-3 h-3 fill-white text-white" />
                    </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
