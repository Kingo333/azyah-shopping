import React from 'react';
import { cn } from '@/lib/utils';

interface CategoryBottomBarProps {
  categories: Array<{ value: string; label: string }>;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryBottomBar: React.FC<CategoryBottomBarProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <div className="fixed bottom-[140px] left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-3 px-4 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all h-9",
              activeCategory === cat.value
                ? "bg-[#7A143E] text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};
