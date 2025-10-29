import React, { useRef, useEffect } from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { cn } from '@/lib/utils';

interface LayerCarouselProps {
  items: WardrobeItem[];
  currentItemId: string | null;
  onItemSelect: (item: WardrobeItem, index: number) => void;
  scrollToIndex?: number;
}

export const LayerCarousel: React.FC<LayerCarouselProps> = ({
  items,
  currentItemId,
  onItemSelect,
  scrollToIndex,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToIndex !== undefined && carouselRef.current) {
      const container = carouselRef.current;
      const itemWidth = 100; // approximate width
      const scrollPosition = scrollToIndex * itemWidth;
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [scrollToIndex]);

  if (items.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-30 pb-safe">
        <div className="h-[140px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No items in this category</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-30 pb-safe">
      <div
        ref={carouselRef}
        className="flex items-center gap-3 overflow-x-auto px-4 py-4 h-[140px] scrollbar-hide scroll-smooth snap-x snap-mandatory"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onItemSelect(item, index)}
            className={cn(
              "shrink-0 w-20 h-20 rounded-lg border-2 transition-all snap-center",
              "hover:scale-105 active:scale-95",
              currentItemId === item.id
                ? "border-[#7A143E] shadow-lg scale-110"
                : "border-border/50 hover:border-border"
            )}
          >
            <img
              src={item.image_bg_removed_url || item.image_url}
              alt={item.category}
              className="w-full h-full object-contain p-1"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
