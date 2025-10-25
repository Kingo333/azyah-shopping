import React from 'react';
import { WardrobeItemCard } from './WardrobeItemCard';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { Pin, X, Lock } from 'lucide-react';
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
      "mb-4 border rounded-lg p-4 transition-all relative",
      layer.is_pinned && "bg-primary/5 border-primary/30 shadow-md"
    )}>
      {/* Pinned Lock Overlay */}
      {layer.is_pinned && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium">
          <Lock className="w-3 h-3" />
          Locked
        </div>
      )}

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
            title={layer.is_pinned ? "Unpin layer" : "Pin layer"}
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

      {/* Scrollable Items Container */}
      <div className={cn(
        "relative",
        layer.is_pinned && "pointer-events-none opacity-75"
      )}>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground italic text-center py-8">
            No items in this category yet
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="flex gap-3 pb-2 min-w-min">
              {items.map((item) => (
                <div key={item.id} className="w-[140px] flex-shrink-0">
                  <WardrobeItemCard
                    item={item}
                    isSelected={selectedItems.includes(item.id)}
                    onToggle={() => onToggleItem(item.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
