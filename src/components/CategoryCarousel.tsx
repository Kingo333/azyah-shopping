import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { usePublicProducts } from '@/hooks/usePublicProducts';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { cn } from '@/lib/utils';
import type { TopCategory } from '@/lib/categories';

interface CategoryCarouselProps {
  selectedCategories: TopCategory[];
  onCategoryToggle: (category: TopCategory) => void;
}

const CATEGORIES = [
  { slug: 'modestwear' as TopCategory, name: 'Modest Wear', color: 'bg-gradient-to-br from-violet-500/20 to-purple-600/20' },
  { slug: 'clothing' as TopCategory, name: 'Clothing', color: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20' },
  { slug: 'bags' as TopCategory, name: 'Bags', color: 'bg-gradient-to-br from-pink-500/20 to-rose-600/20' },
  { slug: 'footwear' as TopCategory, name: 'Footwear', color: 'bg-gradient-to-br from-emerald-500/20 to-green-600/20' }
];

const CategoryCarousel: React.FC<CategoryCarouselProps> = ({ selectedCategories, onCategoryToggle }) => {
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
      
      <Carousel className="w-full" opts={{ align: "start", loop: false }}>
        <CarouselContent>
          {CATEGORIES.map((category) => (
            <CarouselItem key={category.slug} className="md:basis-1/2 lg:basis-1/3">
              <CategoryCard 
                category={category}
                isSelected={selectedCategories.includes(category.slug)}
                onToggle={() => onCategoryToggle(category.slug)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};

const CategoryCard: React.FC<{
  category: { slug: TopCategory; name: string; color: string };
  isSelected: boolean;
  onToggle: () => void;
}> = ({ category, isSelected, onToggle }) => {
  const { data: products = [] } = usePublicProducts(4, 0, category.slug);

  return (
    <Card className={cn(
      "cursor-pointer transition-all duration-300 hover:shadow-lg",
      isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
    )}>
      <CardContent className="p-0">
        <Button
          variant="ghost"
          className="w-full h-full p-0 hover:bg-transparent"
          onClick={onToggle}
        >
          <div className={cn("w-full rounded-lg overflow-hidden", category.color)}>
            {/* Header */}
            <div className="p-4 pb-2">
              <h3 className="font-bold text-lg text-foreground">{category.name}</h3>
              <p className="text-sm text-muted-foreground">
                {products.length} items
              </p>
            </div>
            
            {/* Product Grid */}
            <div className="grid grid-cols-2 gap-1 p-4 pt-2">
              {products.slice(0, 4).map((product, index) => (
                <div key={product.id} className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
                  <img
                    src={getPrimaryImageUrl(product)}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
              ))}
              
              {/* Placeholder for missing products */}
              {Array.from({ length: Math.max(0, 4 - products.length) }).map((_, index) => (
                <div key={`placeholder-${index}`} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-muted-foreground/20 rounded-full" />
                </div>
              ))}
            </div>
            
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-primary-foreground rounded-full" />
              </div>
            )}
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};

export default CategoryCarousel;