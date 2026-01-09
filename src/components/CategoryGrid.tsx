import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TopCategory, SubCategory } from '@/lib/categories';
import SubcategoryCarousel from '@/components/SubcategoryCarousel';

// Import default category images
const modestWearImage = '/lovable-uploads/553f6cd6-f082-43bf-bba2-79e8d824e681.png';
import clothingImage from '@/assets/category-clothing.jpg';
import bagsImage from '@/assets/category-bags.jpg';
import footwearImage from '@/assets/category-footwear.jpg';

interface CategoryGridProps {
  selectedCategories: TopCategory[];
  onCategoryToggle: (category: TopCategory) => void;
  selectedSubcategories?: SubCategory[];
  onSubcategoryToggle?: (subcategory: SubCategory) => void;
}

const CATEGORIES = [
  {
    slug: 'modestwear' as TopCategory,
    name: 'Modest Wear',
    color: 'bg-gradient-to-br from-violet-500/20 to-purple-600/20',
    defaultImage: modestWearImage
  },
  {
    slug: 'clothing' as TopCategory,
    name: 'Clothing',
    color: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20',
    defaultImage: clothingImage
  },
  {
    slug: 'bags' as TopCategory,
    name: 'Bags',
    color: 'bg-gradient-to-br from-pink-500/20 to-rose-600/20',
    defaultImage: bagsImage
  },
  {
    slug: 'footwear' as TopCategory,
    name: 'Footwear',
    color: 'bg-gradient-to-br from-emerald-500/20 to-green-600/20',
    defaultImage: footwearImage
  }
];

const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategories,
  onCategoryToggle,
  selectedSubcategories = [],
  onSubcategoryToggle
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-playfair">Our Best Categories</h2>
        {selectedCategories.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedCategories.length} selected
          </Badge>
        )}
      </div>
      
      {/* Responsive Grid: 2 cols mobile, 4 cols tablet+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {CATEGORIES.map(category => (
          <CategoryCard 
            key={category.slug}
            category={category}
            isSelected={selectedCategories.includes(category.slug)}
            onToggle={() => onCategoryToggle(category.slug)}
          />
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

const CategoryCard: React.FC<{
  category: {
    slug: TopCategory;
    name: string;
    color: string;
    defaultImage: string;
  };
  isSelected: boolean;
  onToggle: () => void;
}> = ({ category, isSelected, onToggle }) => {
  return (
    <Card className={cn(
      "group cursor-pointer transition-all duration-300 hover:shadow-lg border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden h-32 md:h-36",
      isSelected ? "ring-2 ring-primary shadow-lg scale-[1.02]" : "hover:shadow-md hover:scale-[1.01]"
    )}>
      <CardContent className="p-0 relative h-full overflow-hidden">
        <Button 
          variant="ghost" 
          className="w-full h-full p-0 hover:bg-transparent" 
          onClick={onToggle}
        >
          <div className="w-full h-full relative overflow-hidden">
            {/* Background Thumbnail */}
            <div className="absolute inset-0">
              <img 
                src={category.defaultImage} 
                alt={`${category.name} category`} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>
            
            {/* Content positioned at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
              <h3 className="font-bold text-sm md:text-base text-white drop-shadow-lg text-center">
                {category.name}
              </h3>
              <div className="w-8 h-0.5 bg-white/60 mt-1 mx-auto transition-all duration-300 group-hover:w-12 group-hover:bg-white" />
            </div>
            
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full" />
              </div>
            )}
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};

export default CategoryGrid;
