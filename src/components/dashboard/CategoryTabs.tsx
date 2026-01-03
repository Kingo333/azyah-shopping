import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_TREE, getCategoryDisplayName, type TopCategory } from '@/lib/categories';

// Top-level categories to display (matching UnifiedCategoryFilter)
const DISPLAY_CATEGORIES: TopCategory[] = [
  'clothing',
  'modestwear', 
  'footwear',
  'accessories',
  'jewelry',
  'beauty',
  'bags',
  'fragrance',
];

export const CategoryTabs: React.FC = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: TopCategory) => {
    navigate(`/swipe?category=${category}`);
  };

  return (
    <section className="px-4 pt-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {DISPLAY_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[72px] border border-border/50"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-[hsl(var(--azyah-maroon))]/25">
              <span className="text-xs font-semibold text-[hsl(var(--azyah-maroon))]/70">
                {getCategoryDisplayName(category).slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight whitespace-nowrap">
              {getCategoryDisplayName(category)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryTabs;
