import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayerItemCarouselProps {
  items: WardrobeItem[];
  selectedItemId: string | null;
  onItemSelect: (item: WardrobeItem) => void;
}

export const LayerItemCarousel: React.FC<LayerItemCarouselProps> = ({
  items,
  selectedItemId,
  onItemSelect,
}) => {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center px-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            No items in this category
          </p>
          <p className="text-xs text-muted-foreground">
            Add items to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {items.map((item) => {
        const isSelected = item.id === selectedItemId;
        
        return (
          <div
            key={item.id}
            onClick={() => onItemSelect(item)}
            className={cn(
              "relative rounded-lg overflow-hidden cursor-pointer transition-all",
              "border-2 hover:border-primary/50",
              isSelected ? "border-primary" : "border-transparent"
            )}
          >
            {/* Item Image */}
            <div className="aspect-[3/4] bg-muted flex items-center justify-center">
              <img
                src={item.image_url}
                alt={item.brand || 'Item'}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>

            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-8 h-8 bg-foreground rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-5 h-5 text-background" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
