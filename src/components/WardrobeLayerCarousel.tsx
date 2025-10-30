import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const rafIdRef = useRef<number>();
  
  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dresses',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  };

  // Precise center detection
  const getCenterX = useCallback((scroller: HTMLElement) => {
    const rect = scroller.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }, []);

  const findNearestCenterCard = useCallback((scroller: HTMLElement) => {
    const centerX = getCenterX(scroller);
    let bestCard: HTMLElement | null = null;
    let bestDistance = Infinity;

    scroller.querySelectorAll<HTMLElement>('[data-item-id]').forEach(card => {
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenterX - centerX);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCard = card;
      }
    });

    return bestCard;
  }, [getCenterX]);

  const applyCenterClasses = useCallback((scroller: HTMLElement) => {
    const cards = scroller.querySelectorAll<HTMLElement>('[data-item-id]');
    cards.forEach(card => {
      card.classList.remove('is-center', 'is-neighbor');
    });

    const centerCard = findNearestCenterCard(scroller);
    if (centerCard) {
      centerCard.classList.add('is-center');
      (centerCard.previousElementSibling as HTMLElement | null)?.classList.add('is-neighbor');
      (centerCard.nextElementSibling as HTMLElement | null)?.classList.add('is-neighbor');

      // Update selection if center changed
      const itemId = centerCard.dataset.itemId;
      if (itemId && itemId !== selectedItemId) {
        onItemClick(itemId);
      }
    }
  }, [findNearestCenterCard, selectedItemId, onItemClick]);

  const centerCard = useCallback((scroller: HTMLElement, card: HTMLElement) => {
    const scrollerRect = scroller.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = (cardRect.left + cardRect.width / 2) - (scrollerRect.left + scrollerRect.width / 2);
    
    scroller.scrollTo({ 
      left: scroller.scrollLeft + delta, 
      behavior: 'smooth' 
    });

    // Re-apply classes after scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyCenterClasses(scroller);
      });
    });
  }, [applyCenterClasses]);

  const centerByItemId = useCallback((scroller: HTMLElement, itemId: string) => {
    const card = scroller.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`);
    if (card) {
      centerCard(scroller, card);
    }
  }, [centerCard]);

  // Initialize centering on mount
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller || items.length === 0) return;

    // Initial centering
    if (selectedItemId) {
      centerByItemId(scroller, selectedItemId);
    } else {
      const firstCard = scroller.querySelector<HTMLElement>('[data-item-id]');
      if (firstCard) {
        centerCard(scroller, firstCard);
      }
    }

    // Bind scroll handler
    const handleScroll = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        applyCenterClasses(scroller);
      });
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      applyCenterClasses(scroller);
    });
    resizeObserver.observe(scroller);

    // Prevent "between items" states
    const snapIfBetween = () => {
      const centerCard = findNearestCenterCard(scroller);
      if (centerCard) {
        centerCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    };

    const events = ['touchend', 'pointerup', 'mouseup'];
    events.forEach(evt => {
      scroller.addEventListener(evt, snapIfBetween, { passive: true });
    });

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      events.forEach(evt => {
        scroller.removeEventListener(evt, snapIfBetween);
      });
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [items, selectedItemId, centerByItemId, centerCard, applyCenterClasses, findNearestCenterCard]);

  // Re-center when selectedItemId changes externally (e.g., from Shuffle)
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller || !selectedItemId) return;

    centerByItemId(scroller, selectedItemId);
  }, [selectedItemId, centerByItemId]);

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
            style={{
              height: 'clamp(180px, 24vh, 240px)',
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                data-item-id={item.id}
                className="rail-card"
                onClick={() => onItemClick(item.id)}
              >
                {/* Pin icon on item */}
                {selectedItemId === item.id && layer.is_pinned && (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
