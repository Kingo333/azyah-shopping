import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const categories = [
  { value: 'all', label: 'All' },
  { value: 'tops', label: 'Tops' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'accessories', label: 'Accessories' },
];

interface CategoryFilterChipsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilterChips = ({ selectedCategory, onCategoryChange }: CategoryFilterChipsProps) => {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 p-1">
        {categories.map((category) => (
          <Badge
            key={category.value}
            variant={selectedCategory === category.value ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              selectedCategory === category.value && "shadow-md"
            )}
            onClick={() => onCategoryChange(category.value)}
          >
            {category.label}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
};
