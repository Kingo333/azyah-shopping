import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WardrobeItemCardProps {
  item: WardrobeItem;
  isSelected: boolean;
  onToggle: () => void;
}

export const WardrobeItemCard: React.FC<WardrobeItemCardProps> = ({
  item,
  isSelected,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative aspect-[3/4] transition-all group bg-transparent",
        isSelected && "scale-95"
      )}
    >
      {/* Image - sticker style with no background */}
      <img
        src={item.image_bg_removed_url || item.image_url}
        alt={item.category}
        className={cn(
          "w-full h-full object-contain transition-all",
          isSelected && "drop-shadow-xl"
        )}
        loading="lazy"
      />

      {/* Selection Indicator - only show when selected */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-lg animate-scale-in">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </button>
  );
};
