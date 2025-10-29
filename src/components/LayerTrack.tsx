import React, { useRef, useEffect } from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayerTrackProps {
  category: string;
  items: WardrobeItem[];
  selectedIndex: number;
  isPinned: boolean;
  isActive: boolean;
  onItemChange: (item: WardrobeItem, index: number) => void;
  zIndex: number;
}

export const LayerTrack: React.FC<LayerTrackProps> = ({
  category,
  items,
  selectedIndex,
  isPinned,
  isActive,
  onItemChange,
  zIndex,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Restore scroll position when selectedIndex changes externally
  useEffect(() => {
    if (carouselRef.current && !isScrollingRef.current) {
      const container = carouselRef.current;
      const itemWidth = container.clientWidth;
      container.scrollTo({ left: selectedIndex * itemWidth, behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    if (!carouselRef.current || isPinned || !isActive) return;

    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.clientWidth;
    const newIndex = Math.round(scrollLeft / itemWidth);

    if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < items.length) {
      isScrollingRef.current = true;
      onItemChange(items[newIndex], newIndex);
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 100);
    }
  };

  // Show empty state for categories with no items
  if (items.length === 0) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex }}
      >
        <div className="text-center space-y-2 px-4 opacity-30">
          <p className="text-sm font-medium text-muted-foreground">
            No {category} items yet
          </p>
          <p className="text-xs text-muted-foreground">
            Add items to your wardrobe first
          </p>
        </div>
      </div>
    );
  }

  // Validate selectedIndex
  if (selectedIndex < 0 || selectedIndex >= items.length) {
    return null;
  }

  const currentItem = items[selectedIndex];

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex }}
    >
      <div
        ref={carouselRef}
        className={cn(
          "flex overflow-x-auto h-full w-full scrollbar-hide",
          "scroll-snap-type-x-mandatory",
          isPinned && "pointer-events-none"
        )}
        style={{
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-full h-full flex items-center justify-center"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="relative">
              <img
                src={item.image_bg_removed_url || item.image_url}
                alt={category}
                className="object-contain transition-all duration-300"
                style={{
                  maxHeight: '78dvh',
                  maxWidth: '92vw',
                  width: 'auto',
                  height: 'auto',
                  filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
                }}
                loading={index === selectedIndex ? 'eager' : 'lazy'}
              />
              {isPinned && index === selectedIndex && (
                <div className="absolute top-2 right-2 bg-[#7A143E] text-white p-1.5 rounded-full shadow-lg animate-scale-in">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
