import React from 'react';
import { WardrobeItemCard } from './WardrobeItemCard';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { AddLayerButton } from './AddLayerButton';

interface WardrobeAllItemsGridProps {
  items: WardrobeItem[];
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onAddNew: () => void;
  onItemClick: (item: WardrobeItem) => void;
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onAddLayer?: (category: string) => void;
  availableCategories?: Array<{ value: string; label: string }>;
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
  availableCategories = [],
}) => {

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">All Items</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddNew}
            className="h-6 px-2 text-[11px] font-medium hover:bg-accent/50 gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Item</span>
          </Button>
          {onToggleSelectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSelectionMode}
              className="h-6 px-2 text-[11px] font-medium hover:bg-accent/50"
            >
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          {onAddLayer && (
            <AddLayerButton
              availableCategories={availableCategories}
              onAddLayer={onAddLayer}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {/* Item Cards */}
        {items.map((item) => (
          <div key={item.id} className="wardrobe-card">
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
