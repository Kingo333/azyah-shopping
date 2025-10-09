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
        "relative aspect-[3/4] rounded-lg overflow-hidden bg-muted/30 border-2 transition-all",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
      )}
    >
      {/* Image */}
      <img
        src={item.image_bg_removed_url || item.image_url}
        alt={item.category}
        className="w-full h-full object-contain p-2"
        loading="lazy"
      />

      {/* Selection Indicator */}
      <div
        className={cn(
          "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
          isSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "bg-background/80 border-muted-foreground/50"
        )}
      >
        {isSelected && <Check className="w-4 h-4" />}
      </div>

      {/* Category Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-[10px] text-white font-medium capitalize truncate">
          {item.category}
        </p>
      </div>
    </button>
  );
};
