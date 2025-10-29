import React, { useRef, useEffect, useState } from 'react';
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
  const [localCenterId, setLocalCenterId] = useState<string | null>(selectedItemId);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSelectedRef = useRef<string | null>(selectedItemId);
  
  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dresses',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  };

  // Initialize and respond to external selection changes (including shuffle)
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    // Set CSS variables for sizing
    const vw = window.innerWidth;
    const cardW = Math.round(vw * 0.58);
    rail.style.setProperty('--card-w', `${cardW}px`);
    const sidePad = Math.round((vw - cardW) / 2);
    rail.style.setProperty('--rail-side-pad', `${sidePad}px`);

    // Snap to selected item when it changes externally (including after shuffle)
    // Only if selectedItemId changed from outside (not from our own scroll)
    if (selectedItemId && selectedItemId !== lastSelectedRef.current) {
      const targetCard = rail.querySelector<HTMLElement>(`[data-item-id="${selectedItemId}"]`);
      if (targetCard) {
        const targetLeft = targetCard.offsetLeft - (rail.clientWidth - targetCard.clientWidth) / 2;
        rail.scrollTo({ left: Math.round(targetLeft), behavior: 'smooth' });
        setLocalCenterId(selectedItemId);
        lastSelectedRef.current = selectedItemId;
      }
    }
  }, [items.length, selectedItemId]);

  // Handle user scroll with immediate visual feedback and debounced updates
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail) return;

    const handleScroll = () => {
      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Find centered card
      const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
      const cx = rail.scrollLeft + rail.clientWidth / 2;

      let bestCard: HTMLElement | null = null;
      let bestDist = Infinity;

      cards.forEach((card) => {
        const cardCx = card.offsetLeft + card.clientWidth / 2;
        const dist = Math.abs(cardCx - cx);
        if (dist < bestDist) {
          bestDist = dist;
          bestCard = card;
        }
      });

      // Update visual state immediately for smooth feedback
      requestAnimationFrame(() => {
        cards.forEach(c => c.classList.toggle('is-center', c === bestCard));
        if (bestCard?.dataset.itemId) {
          setLocalCenterId(bestCard.dataset.itemId);
        }
      });

      // Debounce selection update only (no snap-back)
      scrollTimeoutRef.current = setTimeout(() => {
        if (!bestCard) return;

        // Update selection in database only if changed
        const newItemId = bestCard.dataset.itemId;
        if (newItemId && newItemId !== lastSelectedRef.current) {
          lastSelectedRef.current = newItemId;
          onItemSelect(newItemId);
        }
      }, 500);
    };

    rail.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      rail.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [onItemSelect, items]);

  return (
    <div className="mb-0">
      {/* Header */}
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
            {items.map((item) => {
              const isCenter = item.id === localCenterId;

              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  className={cn('rail-card relative', isCenter && 'is-center')}
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
