import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { useLayerPosition } from '@/hooks/useLayerPosition';
import { cn } from '@/lib/utils';

interface SwipeableLayerCarouselProps {
  layer: {
    id: string;
    category: string;
    is_pinned: boolean;
    selected_item_id: string | null;
  };
  items: WardrobeItem[];
  onPinToggle: (layerId: string, isPinned: boolean) => void;
  onRemoveLayer: (layerId: string) => void;
  onAddItem: (category?: string) => void;
  onItemClick: (layerId: string, itemId: string) => void;
}

export const SwipeableLayerCarousel: React.FC<SwipeableLayerCarouselProps> = ({
  layer,
  items,
  onPinToggle,
  onRemoveLayer,
  onAddItem,
  onItemClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const touchStartRef = useRef<{ x: number; time: number } | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  // Position state management
  const { position, currentItem, setPosition } = useLayerPosition({
    layerId: layer.id,
    items,
    selectedItemId: layer.selected_item_id,
  });

  /**
   * Scroll to specific item index
   */
  const scrollToItem = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container || items.length === 0) return;

    const wrappedIndex = ((index % items.length) + items.length) % items.length;
    const itemElement = itemRefsRef.current.get(wrappedIndex);

    if (itemElement) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = itemElement.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + itemRect.left - containerRect.left - (containerRect.width / 2) + (itemRect.width / 2);

      container.scrollTo({
        left: scrollLeft,
        behavior,
      });
    }
  }, [items.length]);

  /**
   * Sync position to scroll (when position changes externally)
   */
  useEffect(() => {
    if (isScrolling) return; // Don't interrupt user scroll
    
    console.log(`🔄 [${layer.category}] Position ${position} → scroll sync`);
    scrollToItem(position, 'smooth');
  }, [position, layer.category, scrollToItem, isScrolling]);

  /**
   * Detect centered item via Intersection Observer
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || items.length === 0) return;

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer with center detection zone
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isScrolling) {
          // Find the most centered item
          const visibleEntries = entries.filter(e => e.isIntersecting);
          if (visibleEntries.length === 0) return;

          const mostCentered = visibleEntries.reduce((prev, curr) => {
            return Math.abs(curr.intersectionRatio - 0.5) < Math.abs(prev.intersectionRatio - 0.5)
              ? curr
              : prev;
          });

          const index = Number(mostCentered.target.getAttribute('data-index'));
          if (!isNaN(index) && index !== position) {
            console.log(`👁️ [${layer.category}] Detected center: index ${index}`);
            setPosition(index);
          }
        }
      },
      {
        root: container,
        rootMargin: '-45% 0px -45% 0px', // 10% center zone
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all items
    itemRefsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [items.length, position, layer.category, isScrolling, setPosition]);

  /**
   * Handle scroll events
   */
  const handleScroll = useCallback(() => {
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  /**
   * Touch swipe detection for velocity
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Fast swipe threshold: 0.5px/ms
    if (velocity > 0.5) {
      console.log(`⚡ Fast swipe detected: ${velocity.toFixed(2)}px/ms`);
    }

    touchStartRef.current = null;
  }, []);

  /**
   * Initial scroll on mount
   */
  useEffect(() => {
    scrollToItem(position, 'auto');
  }, []); // Only on mount

  // Empty state
  if (items.length === 0) {
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {layer.is_pinned && <Pin className="w-4 h-4 text-primary" />}
            <span className="font-medium capitalize">{layer.category}</span>
            <span className="text-sm text-muted-foreground">0 items</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPinToggle(layer.id, layer.is_pinned)}
              className="h-8 w-8"
            >
              <Pin className={cn("w-4 h-4", layer.is_pinned && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveLayer(layer.id)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Empty state CTA */}
        <div className="flex items-center justify-center py-12">
          <Button onClick={() => onAddItem(layer.category)} variant="outline">
            Add {layer.category}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {layer.is_pinned && <Pin className="w-4 h-4 text-primary" />}
          <span className="font-medium capitalize">{layer.category}</span>
          <span className="text-sm text-muted-foreground">{items.length} items</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPinToggle(layer.id, layer.is_pinned)}
            className="h-8 w-8"
          >
            <Pin className={cn("w-4 h-4", layer.is_pinned && "fill-current")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveLayer(layer.id)}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex gap-3 overflow-x-auto px-4 py-2 snap-x snap-mandatory scroll-smooth touch-pan-x"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {items.map((item, index) => {
          const isCentered = currentItem?.id === item.id;

          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) itemRefsRef.current.set(index, el);
                else itemRefsRef.current.delete(index);
              }}
              data-index={index}
              onClick={() => onItemClick(layer.id, item.id)}
              className={cn(
                "rail-card",
                isCentered && "is-center"
              )}
            >
              {/* Image */}
              <img
                src={item.image_url}
                alt={layer.category}
                className="w-full h-full object-contain rounded-xl"
                loading="lazy"
              />

              {/* Pin indicator on centered item */}
              {isCentered && layer.is_pinned && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1.5">
                  <Pin className="w-3 h-3 fill-current" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
