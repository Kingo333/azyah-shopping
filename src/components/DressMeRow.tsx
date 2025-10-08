import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface DressMeRowProps {
  category: string;
  items: WardrobeItem[];
  selectedItem: WardrobeItem | null;
  isPinned: boolean;
  onPin: () => void;
  onSelect: (item: WardrobeItem) => void;
}

export const DressMeRow: React.FC<DressMeRowProps> = ({
  category,
  items,
  selectedItem,
  isPinned,
  onPin,
  onSelect,
}) => {
  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    shoes: 'Shoes',
    accessory: 'Accessories',
    jewelry: 'Jewelry',
    bag: 'Bags',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{categoryLabels[category] || category}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPin}
          className={isPinned ? 'text-primary' : 'text-muted-foreground'}
        >
          {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No items in this category</p>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedItem?.id === item.id
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src={item.image_bg_removed_url || item.image_url}
                  alt={item.category}
                  className="w-full h-full object-contain bg-muted"
                />
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
};
