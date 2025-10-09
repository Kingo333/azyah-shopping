import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';

interface WardrobeThumbnailRailProps {
  items: WardrobeItem[];
  onSelectItem: (item: WardrobeItem) => void;
}

export const WardrobeThumbnailRail: React.FC<WardrobeThumbnailRailProps> = ({
  items,
  onSelectItem,
}) => {
  if (items.length === 0) {
    return (
      <div className="h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
        <p className="text-xs text-muted-foreground">No items in this category</p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden border border-border hover:border-primary hover:shadow-md transition-all group relative"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #f0f0f0 0, #f0f0f0 10px, #e0e0e0 10px, #e0e0e0 20px)',
              backgroundSize: '20px 20px',
            }}
          >
            <img
              src={item.thumb_path || item.image_bg_removed_url || item.image_url}
              alt={item.category}
              className="w-full h-full object-contain p-1"
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Plus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
