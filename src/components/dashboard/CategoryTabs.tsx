import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type TopCategory } from '@/lib/categories';
import { Shirt, Moon, Footprints, Watch, Gem, Flower2, Briefcase, Wind } from 'lucide-react';

// Category config with icons and labels
const CATEGORY_CONFIG: { category: TopCategory; label: string; icon: React.ElementType }[] = [
  { category: 'clothing', label: 'Clothing', icon: Shirt },
  { category: 'modestwear', label: 'Modest', icon: Moon },
  { category: 'footwear', label: 'Footwear', icon: Footprints },
  { category: 'accessories', label: 'Accessories', icon: Watch },
  { category: 'jewelry', label: 'Jewelry', icon: Gem },
  { category: 'beauty', label: 'Beauty', icon: Flower2 },
  { category: 'bags', label: 'Bags', icon: Briefcase },
  { category: 'fragrance', label: 'Fragrance', icon: Wind },
];

export const CategoryTabs: React.FC = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: TopCategory) => {
    navigate(`/swipe?category=${category}`);
  };

  return (
    <section className="px-4 pt-4">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {CATEGORY_CONFIG.map(({ category, label, icon: Icon }) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className="flex flex-col items-center justify-center gap-1 p-2 sm:p-2.5 bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border/40"
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--azyah-maroon))]" />
            <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryTabs;
