import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type TopCategory } from '@/lib/categories';
import { Shirt, Moon, Footprints, Watch, Gem, Sparkles, ShoppingBag, Droplets } from 'lucide-react';

// Category config with icons
const CATEGORY_CONFIG: { category: TopCategory; icon: React.ElementType }[] = [
  { category: 'clothing', icon: Shirt },
  { category: 'modestwear', icon: Moon },
  { category: 'footwear', icon: Footprints },
  { category: 'accessories', icon: Watch },
  { category: 'jewelry', icon: Gem },
  { category: 'beauty', icon: Sparkles },
  { category: 'bags', icon: ShoppingBag },
  { category: 'fragrance', icon: Droplets },
];

export const CategoryTabs: React.FC = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: TopCategory) => {
    navigate(`/swipe?category=${category}`);
  };

  return (
    <section className="px-4 pt-4">
      <div className="grid grid-cols-4 gap-2">
        {CATEGORY_CONFIG.map(({ category, icon: Icon }) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className="flex items-center justify-center p-2.5 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border/50 aspect-square"
          >
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center border border-[hsl(var(--azyah-maroon))]/25">
              <Icon className="w-4 h-4 text-[hsl(var(--azyah-maroon))]/80" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryTabs;
