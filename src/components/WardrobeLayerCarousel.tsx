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
  const scrollDebounceRef = useRef<NodeJS.Timeout>();

  // 🔥 FIX: Sync visual center state with selected item
  useEffect(() => {
    if (selectedItemId) {
      setLocalCenterId(selectedItemId);
      console.log(`🎯 [${layer.category}] Visual center synced: ${selectedItemId}`);
    }
  }, [selectedItemId, layer.category]);

  // Grid configuration - treats carousel as discrete cells
  const GRID_CONFIG = {
    cardWidthVw: 0.42,    // Card takes 42% of viewport width (matches CSS)
    gapVw: 0.08,          // Gap is 8% of viewport width (matches CSS)
    get cellWidthVw() { return this.cardWidthVw + this.gapVw; }  // Total cell = 50vw
  };

  // Calculate exact scroll position for a grid index
  const getScrollLeftForIndex = (index: number, viewportWidth: number) => {
    const cardWidth = viewportWidth * GRID_CONFIG.cardWidthVw;
    const cellWidth = viewportWidth * GRID_CONFIG.cellWidthVw;
    const sidePadding = (viewportWidth - cardWidth) / 2;
    return (cellWidth * index) + sidePadding - (viewportWidth / 2) + (cardWidth / 2);
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

    console.log(`🎯 [${layer.category}] Scrolling to grid cell ${itemIndex}: ${selectedItemId}`);

    // Debounce scroll to prevent rapid triggers
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }

    scrollDebounceRef.current = setTimeout(() => {
      setLocalCenterId(selectedItemId);
      setActiveScrollIndex(itemIndex);

      const vw = window.innerWidth;
      const targetScrollLeft = getScrollLeftForIndex(itemIndex, vw);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        });
      });
    }, 10); // 10ms debounce

    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, [selectedItemId, items.length, layer.category, setActiveScrollIndex]);

  // ✅ SNAP HANDLER: Ensure cards snap to center after manual scroll ends
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    let scrollEndTimer: NodeJS.Timeout;

    const handleScrollEnd = () => {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        if (isUserScrollingRef.current) {
          // Calculate which grid cell should be centered
          const vw = window.innerWidth;
          const cellWidth = vw * GRID_CONFIG.cellWidthVw;
          const rawIndex = rail.scrollLeft / cellWidth;
          const snappedIndex = Math.round(rawIndex);
          
          // Snap to exact center position
          const targetScrollLeft = getScrollLeftForIndex(snappedIndex, vw);
          rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
          
          console.log(`📍 Snap: ${rawIndex.toFixed(2)} → ${snappedIndex}`);
        }
      }, 150); // Debounce 150ms after scroll stops
    };

    rail.addEventListener('scroll', handleScrollEnd, { passive: true });
    return () => {
      clearTimeout(scrollEndTimer);
      rail.removeEventListener('scroll', handleScrollEnd);
    };
  }, [items.length]);

  // ✅ SCROLL HANDLER: Sync scroll index across all layers
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    const handleScroll = () => {
      if (!isUserScrollingRef.current) return; // Ignore programmatic scrolls

      // Calculate grid dimensions
      const vw = window.innerWidth;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;

      // Determine which grid cell is currently centered (RAW, unclamped)
      const rawIndex = rail.scrollLeft / cellWidth;
      const snappedIndex = Math.round(rawIndex);

      // 🔥 FIX: Broadcast the UNCLAMPED index to all layers for perfect alignment
      setActiveScrollIndex(snappedIndex);

      // 🔥 FIX: Clamp ONLY for local visual state
      const clampedIndex = Math.max(0, Math.min(snappedIndex, items.length - 1));
      const centeredItem = items[clampedIndex];
      
      if (centeredItem) {
        setLocalCenterId(centeredItem.id);

        // Visual feedback: update card classes
        const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
        cards.forEach((card, idx) => {
          card.classList.toggle('is-center', idx === clampedIndex);
        });
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

  // ✅ INITIAL CENTER: Center first item on mount (only if no selectedItemId)
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0 || selectedItemId) return;

    console.log(`📌 Initial center for ${layer.category}: first item`);

    const vw = window.innerWidth;
    const targetScrollLeft = getScrollLeftForIndex(0, vw);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rail.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
        setLocalCenterId(items[0].id);
      });
    });
  }, []); // Only run once on mount
  
  // ✅ REGISTER CAROUSEL: Register scroll function with context
  useEffect(() => {
    const scrollToIndex = (index: number) => {
      const rail = scrollContainerRef.current;
      if (!rail || items.length === 0) return;

      console.log(`🔗 External scroll to index ${index}`);

      const vw = window.innerWidth;
      const targetScrollLeft = getScrollLeftForIndex(index, vw);

      isUserScrollingRef.current = false; // Prevent sync loop
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });

          // Update visual state only if this layer has an item at this index
          const actualIndex = Math.max(0, Math.min(index, items.length - 1));
          if (items[actualIndex]) {
            setLocalCenterId(items[actualIndex].id);
          }
        });
      });
    };

    registerCarousel(layer.id, scrollToIndex);
    return () => unregisterCarousel(layer.id);
  }, [layer.id, items, registerCarousel, unregisterCarousel]);

  // ✅ RESIZE HANDLER: No CSS variables needed - grid handles it automatically
  useEffect(() => {
    const handleResize = () => {
      const rail = scrollContainerRef.current;
      if (!rail || !selectedItemId) return;

      // Recenter current item after resize
      const itemIndex = items.findIndex(item => item.id === selectedItemId);
      if (itemIndex !== -1) {
        const vw = window.innerWidth;
        const targetScrollLeft = getScrollLeftForIndex(itemIndex, vw);
        rail.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedItemId, items]);

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
              height: 'clamp(200px, 26vh, 260px)', // 🔥 Match CSS card height
            }}
          >
            {items.map((item) => {
              const isCenter = item.id === visualCenterId;

              return (
          <div
            key={item.id}
            data-item-id={item.id}
            data-category={layer.category}
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
