import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '👗' },
  { value: 'top', label: 'Tops', emoji: '👕' },
  { value: 'bottom', label: 'Bottoms', emoji: '👖' },
  { value: 'dress', label: 'Dresses', emoji: '👗' },
  { value: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { value: 'shoes', label: 'Shoes', emoji: '👟' },
  { value: 'bag', label: 'Bags', emoji: '👜' },
  { value: 'accessory', label: 'Accessories', emoji: '🕶️' },
];

interface CategoryChipsProps {
  selected: string;
  onSelect: (category: string) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ selected, onSelect }) => {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={selected === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(cat.value)}
            className="flex-shrink-0 gap-1.5"
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
