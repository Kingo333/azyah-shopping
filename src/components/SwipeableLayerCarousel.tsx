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

    const targetIndex = ((position % items.length) + items.length) % items.length;
    const targetElement = scrollContainerRef.current.children[targetIndex] as HTMLElement;

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [position, items.length, isScrolling]);

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
          const itemIndex = Number(entry.target.getAttribute('data-index'));
          if (!isNaN(itemIndex) && itemIndex !== position) {
            goToPosition(itemIndex);
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
                data-index={index}
                className={`
                  flex-shrink-0 snap-center cursor-pointer
                  transition-all duration-300 ease-out
                  ${isCentered ? 'rail-card is-center' : 'rail-card'}
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
