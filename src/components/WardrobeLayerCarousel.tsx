import React, { useRef } from 'react';
import { WardrobeItemCard } from './WardrobeItemCard';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { Plus, Pin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WardrobeLayerCarouselProps {
  layer: WardrobeLayer;
  items: WardrobeItem[];
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onPinToggle: () => void;
  onRemoveLayer: () => void;
  onAddItem: () => void;
}

export const WardrobeLayerCarousel: React.FC<WardrobeLayerCarouselProps> = ({
  layer,
  items,
  selectedItems,
  onToggleItem,
  onPinToggle,
  onRemoveLayer,
  onAddItem,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
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

      {/* Carousel */}
      <div className="relative group">
        {/* Scroll Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
          style={{ height: '180px' }}
        >
          {/* Add Item Card */}
          <button
            onClick={onAddItem}
            className="flex-shrink-0 w-[120px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-muted/50 transition-all snap-start"
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add Item</span>
          </button>

          {/* Item Cards */}
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[120px] snap-start">
              <WardrobeItemCard
                item={item}
                isSelected={selectedItems.includes(item.id)}
                onToggle={() => onToggleItem(item.id)}
              />
            </div>
          ))}

          {items.length === 0 && (
            <div className="flex-shrink-0 flex items-center justify-center text-sm text-muted-foreground italic px-4">
              No items in this category yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
