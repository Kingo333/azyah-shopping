import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { Skeleton } from '@/components/ui/skeleton';

export const CategoryTabs: React.FC = () => {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();

  const handleCategoryClick = (slug: string) => {
    navigate(`/swipe?category=${slug}`);
  };

  if (loading) {
    return (
      <section className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (!categories.length) return null;

  return (
    <section className="px-4 pt-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.slug)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[72px] border border-border/50"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-[hsl(var(--azyah-maroon))]/25">
              <span className="text-xs font-semibold text-[hsl(var(--azyah-maroon))]/70">
                {category.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight whitespace-nowrap">
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryTabs;
