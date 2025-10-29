import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MiniCarouselSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: WardrobeItem[];
  selectedItemId: string | null;
  onSelect: (item: WardrobeItem) => void;
}

export const MiniCarouselSheet: React.FC<MiniCarouselSheetProps> = ({
  open,
  onOpenChange,
  title,
  items,
  selectedItemId,
  onSelect,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[320px]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex gap-3 overflow-x-auto py-4 scrollbar-hide scroll-smooth snap-x snap-mandatory">
          {items.length === 0 ? (
            <div className="w-full flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No items available</p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onOpenChange(false);
                }}
                className={cn(
                  "shrink-0 w-24 h-24 rounded-lg border-2 transition-all snap-center",
                  "hover:scale-105 active:scale-95",
                  selectedItemId === item.id
                    ? "border-[#7A143E] shadow-lg scale-105"
                    : "border-border/50 hover:border-border"
                )}
              >
                <img
                  src={item.image_bg_removed_url || item.image_url}
                  alt={item.category}
                  className="w-full h-full object-contain p-1"
                  loading="lazy"
                />
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
