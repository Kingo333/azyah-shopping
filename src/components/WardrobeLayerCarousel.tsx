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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>();
  const isProgrammaticScrollRef = useRef(false);
  const [localCenterId, setLocalCenterId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Grid configuration - treats carousel as discrete cells
  const GRID_CONFIG = {
    cardWidthVw: 0.58,  // Card takes 58% of viewport width
    gapVw: 0.05,        // 5% gap between cards
    get cellWidthVw() { return this.cardWidthVw + this.gapVw; }  // Total cell = card + gap
  };
  
  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dresses',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  };

  // Effect: When selectedItemId changes, scroll to its grid cell
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0 || !selectedItemId) return;

    // Find item index in array
    const itemIndex = items.findIndex(item => item.id === selectedItemId);
    if (itemIndex === -1) {
      console.warn(`⚠️ Item not found: ${selectedItemId}`);
      return;
    }

    console.log(`🎯 Snap to grid cell ${itemIndex}: ${selectedItemId}`);

    // Calculate grid dimensions
    const vw = window.innerWidth;
    const cardWidth = vw * GRID_CONFIG.cardWidthVw;
    const cellWidth = vw * GRID_CONFIG.cellWidthVw;
    const sidePadding = (vw - cardWidth) / 2;

    // Set CSS variables
    rail.style.setProperty('--card-w', `${cardWidth}px`);
    rail.style.setProperty('--cell-w', `${cellWidth}px`);
    rail.style.setProperty('--rail-side-pad', `${sidePadding}px`);

    // Cancel pending user scroll updates
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = undefined;
    }

    // Calculate exact scroll position using grid math
    const targetScrollLeft = (cellWidth * itemIndex);

    console.log(`📐 Grid scroll: cell ${itemIndex} → ${targetScrollLeft}px (cell width: ${cellWidth}px)`);

    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = true; // 🚩 Mark as programmatic
      rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      setCurrentIndex(itemIndex);
      setLocalCenterId(selectedItemId);
      console.log(`✅ Snapped to grid cell ${itemIndex} (programmatic)`);
      
      // Clear flag after scroll animation completes (~300ms for smooth scroll)
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 600);
    });
  }, [selectedItemId, items.length, items]);

  // Effect: When user scrolls, detect which grid cell is centered
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    const handleScroll = () => {
      // Clear previous debounce timer
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Calculate grid dimensions
      const vw = window.innerWidth;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;

      // Determine which grid cell is currently centered
      // Formula: index = round(scrollLeft / cellWidth)
      const rawIndex = rail.scrollLeft / cellWidth;
      const snappedIndex = Math.round(rawIndex);
      const clampedIndex = Math.max(0, Math.min(snappedIndex, items.length - 1));

      console.log(`📍 Scroll position: ${rail.scrollLeft}px → Grid index: ${clampedIndex}`);

      // Update visual state immediately
      const centeredItem = items[clampedIndex];
      if (centeredItem) {
        setLocalCenterId(centeredItem.id);
        setCurrentIndex(clampedIndex);

        // Visual feedback: update card classes
        const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
        cards.forEach((card, idx) => {
          card.classList.toggle('is-center', idx === clampedIndex);
        });
      }

      // Debounce database update (500ms after user stops scrolling)
      scrollTimeoutRef.current = setTimeout(() => {
        // ✅ Only update DB if this is a USER scroll, not programmatic
        if (!isProgrammaticScrollRef.current && centeredItem && centeredItem.id !== selectedItemId) {
          console.log(`👆 User selected grid cell ${clampedIndex}: ${centeredItem.id}`);
          onItemSelect(centeredItem.id);
        } else if (isProgrammaticScrollRef.current) {
          console.log(`⏭️ Skipped DB update (programmatic scroll)`);
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
  }, [items, selectedItemId, onItemSelect]);

  // Effect: Initialize - center first item ONLY on initial mount if no selection
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;
    
    // Only initialize if there's NO selection at all (first mount)
    if (!selectedItemId && items.length > 0 && !localCenterId) {
      console.log('🔷 Initial mount: centering first item visually');
      requestAnimationFrame(() => {
        const firstCard = rail.querySelector<HTMLElement>('[data-item-id]');
        if (firstCard) {
          isProgrammaticScrollRef.current = true;
          const vw = window.innerWidth;
          const cardWidth = vw * GRID_CONFIG.cardWidthVw;
          const cellWidth = vw * GRID_CONFIG.cellWidthVw;
          rail.scrollTo({ left: 0, behavior: 'instant' });
          setLocalCenterId(firstCard.dataset.itemId || null);
          setCurrentIndex(0);
          // Instant scroll, shorter timeout
          setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 100);
        }
      });
    }
  }, []); // Only run once on mount

  return (
    <div className="mb-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground capitalize">
            {categoryLabels[layer.category] || layer.category}
          </h3>
          <span className="text-[10px] text-muted-foreground/60">
            {items.length}
          </span>
          {layer.is_pinned && (
            <div className="flex items-center gap-0.5 text-xs text-primary">
              <Lock className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onPinToggle}
            title={layer.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin
              className={cn(
                'w-3 h-3',
                layer.is_pinned && 'fill-primary text-primary'
              )}
            />
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
