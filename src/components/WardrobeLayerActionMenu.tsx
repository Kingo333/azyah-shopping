import React from 'react';
import { Button } from '@/components/ui/button';
import { Pin, Shuffle, Trash2 } from 'lucide-react';

interface WardrobeLayerActionMenuProps {
  isPinned: boolean;
  onPinToggle: () => void;
  onShuffle: () => void;
  onDeleteItem: () => void;
  hasSelectedItem: boolean;
}

export const WardrobeLayerActionMenu: React.FC<WardrobeLayerActionMenuProps> = ({
  isPinned,
  onPinToggle,
  onShuffle,
  onDeleteItem,
  hasSelectedItem,
}) => {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
      <Button
        variant={isPinned ? "default" : "outline"}
        size="icon"
        onClick={onPinToggle}
        className="h-12 w-12 rounded-full shadow-lg"
        title="Pin layer (won't shuffle)"
      >
        <Pin className={`h-5 w-5 ${isPinned ? 'fill-current' : ''}`} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onShuffle}
        className="h-12 w-12 rounded-full shadow-lg"
        title="Shuffle unpinned layers"
      >
        <Shuffle className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onDeleteItem}
        disabled={!hasSelectedItem}
        className="h-12 w-12 rounded-full shadow-lg"
        title="Remove item from layer"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
};
