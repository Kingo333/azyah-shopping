import React from 'react';
import { cn } from '@/lib/utils';
import type { TopCategory, SubCategory } from '@/lib/categories';
import SubcategoryCarousel from '@/components/SubcategoryCarousel';

interface CategoryGridProps {
  selectedCategories: TopCategory[];
  onCategoryToggle: (category: TopCategory) => void;
  selectedSubcategories?: SubCategory[];
  onSubcategoryToggle?: (subcategory: SubCategory) => void;
}

const CATEGORIES: { slug: TopCategory; name: string }[] = [
  { slug: 'modestwear', name: 'Modest Wear' },
  { slug: 'clothing', name: 'Clothing' },
  { slug: 'bags', name: 'Bags' },
  { slug: 'footwear', name: 'Footwear' },
];

const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategories,
  onCategoryToggle,
  selectedSubcategories = [],
  onSubcategoryToggle
}) => {
  return (
    <div className="mb-4">
      {/* Horizontal scrollable pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {CATEGORIES.map(category => (
          <button
            key={category.slug}
            onClick={() => onCategoryToggle(category.slug)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all border whitespace-nowrap",
              selectedCategories.includes(category.slug)
                ? "bg-[hsl(var(--azyah-maroon))] text-white border-[hsl(var(--azyah-maroon))]"
                : "bg-white text-foreground border-border hover:bg-muted/50"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Subcategory Carousel */}
      {selectedCategories.length > 0 && onSubcategoryToggle && (
        <SubcategoryCarousel
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          onSubcategoryToggle={onSubcategoryToggle}
        />
      )}
    </div>
  );
};

export default CategoryGrid;
