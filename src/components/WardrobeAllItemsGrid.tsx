import React from 'react';
import { WardrobeItemCard } from './WardrobeItemCard';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';

interface WardrobeAllItemsGridProps {
  items: WardrobeItem[];
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onAddNew: () => void;
  onItemClick: (item: WardrobeItem) => void;
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onAddLayer?: () => void;
}

export const WardrobeAllItemsGrid: React.FC<WardrobeAllItemsGridProps> = ({
  items,
  selectedItems,
  onToggleItem,
  onAddNew,
  onItemClick,
  selectionMode = false,
  onToggleSelectionMode,
  onAddLayer,
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">All Items</h2>
        <div className="flex items-center gap-2">
          {onToggleSelectionMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSelectionMode}
            >
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          {onAddLayer && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddLayer}
            >
              Add Layer
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
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
          <div key={item.id} className="group">
            <WardrobeItemCard
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onToggle={() => onToggleItem(item.id)}
              onItemClick={() => onItemClick(item)}
              selectionMode={selectionMode}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
