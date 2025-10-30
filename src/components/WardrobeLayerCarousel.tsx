import React, { useRef, useState, useEffect } from 'react';
import { Pin, X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { useLayerScroll } from '@/contexts/LayerScrollContext';

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
  const [localCenterId, setLocalCenterId] = useState<string | null>(null);
  const { activeScrollIndex, setActiveScrollIndex, registerCarousel, unregisterCarousel } = useLayerScroll();
  const isUserScrollingRef = useRef(false);

  // Grid configuration - treats carousel as discrete cells
  const GRID_CONFIG = {
    cardWidthVw: 0.55,    // Card takes 55% of viewport width
    gapVw: 0.08,          // Gap is 8% of viewport width
    get cellWidthVw() { return this.cardWidthVw + this.gapVw; }  // Total cell = 63vw
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

  // ✅ SINGLE EFFECT: Programmatic scroll to selected item
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0 || !selectedItemId) return;

    // Find item index in array
    const itemIndex = items.findIndex(item => item.id === selectedItemId);
    if (itemIndex === -1) {
      console.warn(`⚠️ Item not found: ${selectedItemId}`);
      return;
    }

    console.log(`🎯 Scrolling to grid cell ${itemIndex}: ${selectedItemId}`);

    // Calculate grid dimensions
    const vw = window.innerWidth;
    const cardWidth = vw * GRID_CONFIG.cardWidthVw;
    const cellWidth = vw * GRID_CONFIG.cellWidthVw;
    const sidePadding = (vw - cardWidth) / 2;

    // Update CSS variables synchronously
    rail.style.setProperty('--card-w', `${cardWidth}px`);
    rail.style.setProperty('--cell-w', `${cellWidth}px`);
    rail.style.setProperty('--rail-side-pad', `${sidePadding}px`);

    // Calculate scroll position to center item at 50vw (absolute center)
    // Account for padding in the calculation
    const itemLeftEdge = sidePadding + (cellWidth * itemIndex);  // Item's left edge including padding
    const viewportCenter = vw / 2;                               // Absolute center of viewport
    const cardCenter = cardWidth / 2;                            // Center of the card itself
    const targetScrollLeft = itemLeftEdge - viewportCenter + cardCenter;

    // Use double RAF for layout stability - prevents race conditions when multiple carousels update
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        setLocalCenterId(selectedItemId);
      });
    });
  }, [selectedItemId, items.length, items]); // Depends on items to ensure updates when item order changes

  // ✅ SCROLL HANDLER: Sync scroll index across all layers
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    const handleScroll = () => {
      if (!isUserScrollingRef.current) return; // Ignore programmatic scrolls

      // Calculate grid dimensions
      const vw = window.innerWidth;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;

      // Determine which grid cell is currently centered
      const rawIndex = rail.scrollLeft / cellWidth;
      const snappedIndex = Math.round(rawIndex);
      const clampedIndex = Math.max(0, Math.min(snappedIndex, items.length - 1));

      // Update local visual state
      const centeredItem = items[clampedIndex];
      if (centeredItem) {
        setLocalCenterId(centeredItem.id);

        // Visual feedback: update card classes
        const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
        cards.forEach((card, idx) => {
          card.classList.toggle('is-center', idx === clampedIndex);
        });

        // Sync this scroll position to all other layers
        setActiveScrollIndex(clampedIndex);
      }
    };

    const handleScrollStart = () => {
      isUserScrollingRef.current = true;
    };

    const handleScrollEnd = () => {
      setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 100);
    };

    rail.addEventListener('scroll', handleScroll, { passive: true });
    rail.addEventListener('touchstart', handleScrollStart, { passive: true });
    rail.addEventListener('touchend', handleScrollEnd, { passive: true });
    rail.addEventListener('mousedown', handleScrollStart);
    rail.addEventListener('mouseup', handleScrollEnd);
    
    return () => {
      rail.removeEventListener('scroll', handleScroll);
      rail.removeEventListener('touchstart', handleScrollStart);
      rail.removeEventListener('touchend', handleScrollEnd);
      rail.removeEventListener('mousedown', handleScrollStart);
      rail.removeEventListener('mouseup', handleScrollEnd);
    };
  }, [items, setActiveScrollIndex]);

  // ✅ INITIAL MOUNT: Center first item visually
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0 || selectedItemId) return;

    const firstItem = items[0];
    requestAnimationFrame(() => {
      const vw = window.innerWidth;
      const cardWidth = vw * GRID_CONFIG.cardWidthVw;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;
      const sidePadding = (vw - cardWidth) / 2;
      
      rail.style.setProperty('--card-w', `${cardWidth}px`);
      rail.style.setProperty('--cell-w', `${cellWidth}px`);
      rail.style.setProperty('--rail-side-pad', `${sidePadding}px`);
      
      // Center first item at 50vw
      const viewportCenter = vw / 2;
      const cardCenter = cardWidth / 2;
      const targetScrollLeft = sidePadding - viewportCenter + cardCenter;
      
      rail.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
      setLocalCenterId(firstItem.id);
    });
  }, []); // Only run once on mount
  
  // ✅ REGISTER CAROUSEL: Register scroll function with context
  useEffect(() => {
    const scrollToIndex = (index: number) => {
      const rail = scrollContainerRef.current;
      if (!rail || items.length === 0) return;

      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const vw = window.innerWidth;
      const cardWidth = vw * GRID_CONFIG.cardWidthVw;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;
      const sidePadding = (vw - cardWidth) / 2;

      const itemLeftEdge = sidePadding + (cellWidth * clampedIndex);
      const viewportCenter = vw / 2;
      const cardCenter = cardWidth / 2;
      const targetScrollLeft = itemLeftEdge - viewportCenter + cardCenter;

      isUserScrollingRef.current = false; // Prevent sync loop
      rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });

      // Update visual state
      if (items[clampedIndex]) {
        setLocalCenterId(items[clampedIndex].id);
      }
    };

    registerCarousel(layer.id, scrollToIndex);
    return () => unregisterCarousel(layer.id);
  }, [layer.id, items, registerCarousel, unregisterCarousel]);

  // ✅ RESIZE HANDLER: Recalculate CSS variables on window resize
  useEffect(() => {
    const handleResize = () => {
      const rail = scrollContainerRef.current;
      if (!rail) return;

      const vw = window.innerWidth;
      const cardWidth = vw * GRID_CONFIG.cardWidthVw;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;
      const sidePadding = (vw - cardWidth) / 2;

      rail.style.setProperty('--card-w', `${cardWidth}px`);
      rail.style.setProperty('--cell-w', `${cellWidth}px`);
      rail.style.setProperty('--rail-side-pad', `${sidePadding}px`);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine which item to visually center
  const visualCenterId = selectedItemId || localCenterId || (items.length > 0 ? items[0].id : null);

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
            {items.map((item) => {
              const isCenter = item.id === visualCenterId;

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
