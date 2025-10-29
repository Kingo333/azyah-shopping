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

  // Mark centered card based on offsetLeft (immune to parent transforms)
  const markCenteredCard = useCallback(() => {
    const rail = scrollContainerRef.current;
    if (!rail || layer.is_pinned) return;

    const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
    const cx = rail.scrollLeft + rail.clientWidth / 2;

    let best: HTMLElement | null = null;
    let bestDist = Infinity;

    cards.forEach((card) => {
      const cardCx = card.offsetLeft + card.clientWidth / 2;
      const d = Math.abs(cardCx - cx);
      if (d < bestDist) {
        bestDist = d;
        best = card;
      }
    });

    cards.forEach(c => c.classList.toggle('is-center', c === best));
    if (best?.dataset.itemId && best.dataset.itemId !== centerItemId) {
      setCenterItemId(best.dataset.itemId);
      onItemSelect(best.dataset.itemId);
    }
  }, [centerItemId, onItemSelect, layer.is_pinned]);

  // Snap to nearest card (iOS Safari fallback)
  const snapToNearest = useCallback(() => {
    const rail = scrollContainerRef.current;
    if (!rail || layer.is_pinned) return;

    const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
    const cx = rail.scrollLeft + rail.clientWidth / 2;

    let target: HTMLElement | null = null;
    let bestDist = Infinity;

    cards.forEach((card) => {
      const cardCx = card.offsetLeft + card.clientWidth / 2;
      const d = Math.abs(cardCx - cx);
      if (d < bestDist) {
        bestDist = d;
        target = card;
      }
    });

    if (!target) return;

    const targetLeft = target.offsetLeft - (rail.clientWidth - target.clientWidth) / 2;
    rail.scrollTo({ left: Math.round(targetLeft), behavior: 'smooth' });
  }, [layer.is_pinned]);

  // Setup rail with dynamic sizing
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    // Compute dynamic sizes (58vw for cards, 21vw for side padding)
    const vw = window.innerWidth;
    const cardW = Math.round(vw * 0.58);
    rail.style.setProperty('--card-w', `${cardW}px`);
    const sidePad = Math.round((vw - cardW) / 2);
    rail.style.setProperty('--rail-side-pad', `${sidePad}px`);

    // Initial snap
    markCenteredCard();
    snapToNearest();
  }, [items, markCenteredCard, snapToNearest]);

  // RAF-based scroll handler with iOS snap fallback
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail) return;

    let ticking = false;
    let snapTimer: NodeJS.Timeout;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        markCenteredCard();
        ticking = false;
      });

      // Fallback snap for iOS Safari (no native scrollend)
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => snapToNearest(), 120);
    };

    rail.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      rail.removeEventListener('scroll', onScroll);
      clearTimeout(snapTimer);
    };
  }, [markCenteredCard, snapToNearest]);

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
              'rail-carousel',
              layer.is_pinned && 'pointer-events-none'
            )}
            style={{
              height: 'clamp(180px, 24vh, 240px)',
            }}
          >
            {items.map((item) => {
              const isCenter = item.id === (centerItemId || selectedItemId);

              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  className="rail-card relative"
                >
                  {/* Pin icon on item */}
                  {layer.is_pinned && isCenter && (
                    <div className="absolute top-2 right-2 z-10">
                      <Pin className="w-4 h-4 fill-primary text-primary drop-shadow" />
                    </div>
                  )}
                  
                  {/* Image with object-fit: contain */}
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
