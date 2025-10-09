import React from 'react';
import { WardrobeItemCard } from './WardrobeItemCard';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Plus } from 'lucide-react';

interface WardrobeGridProps {
  items: WardrobeItem[];
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onAddNew: () => void;
}

export const WardrobeGrid: React.FC<WardrobeGridProps> = ({
  items,
  selectedItems,
  onToggleItem,
  onAddNew,
}) => {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {/* Add New Item Card */}
      <button
        onClick={onAddNew}
        className="aspect-[3/4] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-muted/50 transition-all"
      >
        <Plus className="w-8 h-8 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Add Item</span>
      </button>

      {/* Item Cards */}
      {items.map((item) => (
        <WardrobeItemCard
          key={item.id}
          item={item}
          isSelected={selectedItems.includes(item.id)}
          onToggle={() => onToggleItem(item.id)}
        />
      ))}
    </div>
  );
};
