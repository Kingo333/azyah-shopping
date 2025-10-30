import { useRef, useEffect, useState } from 'react';
import { Pin, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayerPosition } from '@/hooks/useLayerPosition';
import type { WardrobeLayer } from '@/hooks/useWardrobeLayers';

interface SwipeableLayerCarouselProps {
  layer: WardrobeLayer;
  items: Array<{ id: string; image_url: string; category: string }>;
  selectedItemId?: string | null;
  onItemClick?: (itemId: string) => void;
  onTogglePin?: () => void;
  onRemoveLayer?: () => void;
  onAddItem?: () => void;
}

export const SwipeableLayerCarousel: React.FC<SwipeableLayerCarouselProps> = ({
  layer,
  items,
  selectedItemId,
  onItemClick,
  onTogglePin,
  onRemoveLayer,
  onAddItem,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Create virtual infinite loop by tripling array
  const virtualItems = items.length > 0 ? [...items, ...items, ...items] : [];
  const realItemsLength = items.length;
  
  const { position, goToPosition, currentItem } = useLayerPosition({
    layerId: layer.id,
    items,
    selectedItemId,
    onPositionChange: (pos, itemId) => {
      onItemClick?.(itemId);
    },
  });

  // Sync position to scroll view (position → visual)
  useEffect(() => {
    if (items.length === 0 || !scrollContainerRef.current || isScrolling) return;

    console.log(`🔄 [${layer.category}] Syncing position ${position} → visual`);

    // Scroll to middle set of virtual items (index + realItemsLength)
    const targetIndex = ((position % items.length) + items.length) % items.length;
    const virtualTargetIndex = targetIndex + realItemsLength; // Use middle set
    const targetElement = scrollContainerRef.current.children[virtualTargetIndex] as HTMLElement;

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [position, items.length, isScrolling, layer.category, realItemsLength]);

  // Detect centered item via Intersection Observer
  useEffect(() => {
    if (!scrollContainerRef.current || items.length === 0) return;

    const options: IntersectionObserverInit = {
      root: scrollContainerRef.current,
      rootMargin: '-45% 0px -45% 0px', // Center 10% zone
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const virtualIndex = Number(entry.target.getAttribute('data-index'));
          if (!isNaN(virtualIndex)) {
            // Convert virtual index to real position
            const realPosition = ((virtualIndex % realItemsLength) + realItemsLength) % realItemsLength;
            if (realPosition !== position) {
              goToPosition(realPosition);
            }
          }
        }
      });
    }, options);

    // Observe all items
    Array.from(scrollContainerRef.current.children).forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, [items.length, position, goToPosition]);

  // Handle scroll start/end
  const handleScroll = () => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium capitalize">{layer.category}</h3>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            className={layer.is_pinned ? 'text-primary' : 'text-muted-foreground'}
          >
            <Pin className="h-4 w-4" fill={layer.is_pinned ? 'currentColor' : 'none'} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveLayer}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg mx-4">
          <Button variant="ghost" onClick={onAddItem} className="flex-col gap-2">
            <Plus className="h-8 w-8" />
            <span className="text-sm">Add {layer.category}</span>
          </Button>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-scroll px-4 py-2 snap-x snap-mandatory scroll-smooth touch-pan-x"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            width: '100%',
          }}
        >
          {virtualItems.map((item, virtualIndex) => {
            const isCentered = currentItem?.id === item.id;
            
            return (
              <div
                key={`${item.id}-${virtualIndex}`}
                data-index={virtualIndex}
                className={`
                  rail-card snap-center cursor-pointer
                  transition-all duration-300 ease-out
                  ${isCentered ? 'is-center' : ''}
                `}
                onClick={() => onItemClick?.(item.id)}
              >
                <img
                  src={item.image_url}
                  alt={item.category}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
