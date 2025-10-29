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
        <h2 className="text-lg font-semibold">All Items</h2>
        <div className="flex items-center gap-1.5 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddNew}
            className="gap-1.5 h-9 px-3 text-xs md:text-sm"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden xs:inline">Add Item</span>
            <span className="xs:hidden">Add</span>
          </Button>
          {onToggleSelectionMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSelectionMode}
              className="h-9 px-3 text-xs md:text-sm"
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
