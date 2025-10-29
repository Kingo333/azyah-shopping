import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WardrobeCategoryTabsProps {
  selected: string;
  onSelect: (category: string) => void;
}

const categories = [
  { value: 'all', label: 'All' },
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'dress', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'bag', label: 'Bags' },
  { value: 'accessory', label: 'Accessories' },
];

export const WardrobeCategoryTabs: React.FC<WardrobeCategoryTabsProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex gap-2 flex-1">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all h-9",
              selected === cat.value
                ? "bg-[#1C1C1E] text-white shadow-md"
                : "bg-[#F8F8F9] text-[#6A6A6A] hover:bg-gray-200"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};
