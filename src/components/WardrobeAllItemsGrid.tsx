import React from 'react';
import { WardrobeItemCard } from './WardrobeItemCard';
import { WardrobeItem, useDeleteWardrobeItem } from '@/hooks/useWardrobeItems';
import { Plus } from 'lucide-react';

interface WardrobeAllItemsGridProps {
  items: WardrobeItem[];
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onAddNew: () => void;
}

export const WardrobeAllItemsGrid: React.FC<WardrobeAllItemsGridProps> = ({
  items,
  selectedItems,
  onToggleItem,
  onAddNew,
}) => {
  const deleteItemMutation = useDeleteWardrobeItem();

  const handleDelete = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">All Items</h2>
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
              onDelete={() => handleDelete(item.id)}
              showDelete={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
