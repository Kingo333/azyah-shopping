import React, { useState } from 'react';
import { WardrobeItemCard } from './WardrobeItemCard';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { Pin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WardrobeLayerCarouselProps {
  layer: WardrobeLayer;
  items: WardrobeItem[];
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onPinToggle: () => void;
  onRemoveLayer: () => void;
}

export const WardrobeLayerCarousel: React.FC<WardrobeLayerCarouselProps> = ({
  layer,
  items,
  selectedItems,
  onToggleItem,
  onPinToggle,
  onRemoveLayer,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const currentItem = items[currentIndex];

  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dresses',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  };

  return (
    <div className={cn(
      "mb-4 border rounded-lg p-4 transition-all",
      layer.is_pinned && "bg-primary/5 border-primary/30 shadow-md"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {layer.is_pinned && <Pin className="w-4 h-4 text-primary fill-primary" />}
          <h3 className="text-base font-semibold capitalize">
            {categoryLabels[layer.category] || layer.category}
          </h3>
          <span className="text-xs text-muted-foreground">
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPinToggle}
          >
            <Pin className={cn(
              "w-4 h-4 transition-all",
              layer.is_pinned ? "fill-primary text-primary" : "text-muted-foreground"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemoveLayer}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Single Item Display */}
      <div className="relative flex items-center justify-center" style={{ height: '200px' }}>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">
            No items in this category yet
          </div>
        ) : (
          <>
            {/* Navigation Buttons */}
            {items.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Current Item */}
            <div className="w-[140px]">
              <WardrobeItemCard
                item={currentItem}
                isSelected={selectedItems.includes(currentItem.id)}
                onToggle={() => onToggleItem(currentItem.id)}
              />
            </div>

            {/* Item Counter */}
            {items.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                {currentIndex + 1} / {items.length}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
