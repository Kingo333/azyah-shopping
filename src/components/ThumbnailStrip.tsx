import React, { useRef, useEffect } from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { cn } from '@/lib/utils';

interface ThumbnailStripProps {
  items: WardrobeItem[];
  selectedItemId: string | null;
  onItemTap: (item: WardrobeItem) => void;
}

export const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({
  items,
  selectedItemId,
  onItemTap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedItemId]);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide bg-background border-t border-border"
    >
      {items.map((item) => {
        const isSelected = item.id === selectedItemId;
        
        return (
          <div
            key={item.id}
            ref={isSelected ? selectedRef : null}
            onClick={() => onItemTap(item)}
            className={cn(
              "flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden cursor-pointer transition-all",
              "border-2",
              isSelected ? "border-foreground scale-105" : "border-border opacity-70 hover:opacity-100"
            )}
          >
            <img
              src={item.image_url}
              alt={item.brand || 'Item'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
};
