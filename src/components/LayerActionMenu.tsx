import React from 'react';
import { Check, Move, Lock, Unlock, Shuffle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LayerActionMenuProps {
  isPinned: boolean;
  onPin: () => void;
  onShuffle: () => void;
  onDelete: () => void;
  onMoveToCanvas: () => void;
  disabled?: boolean;
}

export const LayerActionMenu: React.FC<LayerActionMenuProps> = ({
  isPinned,
  onPin,
  onShuffle,
  onDelete,
  onMoveToCanvas,
  disabled = false,
}) => {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      <Button
        size="icon"
        variant="secondary"
        onClick={onMoveToCanvas}
        disabled={disabled}
        className="h-12 w-12 rounded-full shadow-lg bg-background hover:bg-accent"
        title="Move to Canvas"
      >
        <Move className="h-5 w-5" />
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={onPin}
        disabled={disabled}
        className={cn(
          "h-12 w-12 rounded-full shadow-lg transition-colors",
          isPinned 
            ? "bg-[#7A143E] text-white hover:bg-[#7A143E]/90" 
            : "bg-background hover:bg-accent"
        )}
        title={isPinned ? "Unpin" : "Pin"}
      >
        {isPinned ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={onShuffle}
        disabled={disabled}
        className="h-12 w-12 rounded-full shadow-lg bg-background hover:bg-accent"
        title="Shuffle"
      >
        <Shuffle className="h-5 w-5" />
      </Button>

      <Button
        size="icon"
        variant="destructive"
        onClick={onDelete}
        disabled={disabled}
        className="h-12 w-12 rounded-full shadow-lg"
        title="Delete"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
};
