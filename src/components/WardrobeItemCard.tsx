import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WardrobeItemCardProps {
  item: WardrobeItem;
  isSelected: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
  selectionMode?: boolean;
}

export const WardrobeItemCard: React.FC<WardrobeItemCardProps> = ({
  item,
  isSelected,
  onToggle,
  onItemClick,
  selectionMode = false,
}) => {
  const handleClick = () => {
    if (selectionMode) {
      onToggle();
    } else if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={cn(
          "relative aspect-[3/4] transition-all group bg-transparent w-full",
          isSelected && "scale-95"
        )}
      >
        {/* Image - sticker style with no background */}
        <img
          src={item.image_bg_removed_url || item.image_url}
          alt={item.category}
          className={cn(
            "w-full h-full object-contain transition-all scale-[1.3]",
            isSelected && "drop-shadow-xl"
          )}
          loading="lazy"
        />

        {/* Selection Indicator - only show when selected in selection mode */}
        {selectionMode && isSelected && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-lg animate-scale-in">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </button>
    </div>
  );
};
