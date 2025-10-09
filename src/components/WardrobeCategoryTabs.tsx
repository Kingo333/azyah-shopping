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
  { value: 'shoes', label: 'Shoes' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'accessory', label: 'Accessories' },
];

export const WardrobeCategoryTabs: React.FC<WardrobeCategoryTabsProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <Button
          key={cat.value}
          variant={selected === cat.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(cat.value)}
          className={cn(
            "shrink-0 rounded-full transition-all",
            selected === cat.value ? "shadow-md" : ""
          )}
        >
          {cat.label}
        </Button>
      ))}
    </div>
  );
};
