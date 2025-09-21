import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from '@/components/ui/carousel';
import { usePublicProducts } from '@/hooks/usePublicProducts';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { cn } from '@/lib/utils';
import { CATEGORY_TREE, getSubcategoriesForCategory, getSubcategoryDisplayName } from '@/lib/categories';
import type { TopCategory, SubCategory } from '@/lib/categories';

interface SubcategoryCarouselProps {
  selectedCategories: TopCategory[];
  selectedSubcategories: SubCategory[];
  onSubcategoryToggle: (subcategory: SubCategory) => void;
}

const SubcategoryCarousel: React.FC<SubcategoryCarouselProps> = ({
  selectedCategories,
  selectedSubcategories,
  onSubcategoryToggle
}) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Get all subcategories for selected categories
  const subcategories = React.useMemo(() => {
    if (selectedCategories.length === 0) return [];
    
    const allSubcategories = new Set<SubCategory>();
    selectedCategories.forEach(category => {
      const subs = getSubcategoriesForCategory(category);
      subs.forEach(sub => allSubcategories.add(sub));
    });
    return Array.from(allSubcategories);
  }, [selectedCategories]);

  useEffect(() => {
    if (!api) return;

    const startAutoplay = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (api.canScrollNext()) {
          api.scrollNext();
        } else {
          api.scrollTo(0);
        }
      }, 5000);
    };

    const stopAutoplay = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };

    startAutoplay();

    api.on('pointerDown', () => {
      stopAutoplay();
      setTimeout(startAutoplay, 3000);
    });

    return () => {
      stopAutoplay();
    };
  }, [api]);

  if (selectedCategories.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 animate-in slide-in-from-top duration-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-playfair">Subcategories</h3>
        {selectedSubcategories.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {selectedSubcategories.length} selected
          </Badge>
        )}
      </div>
      
      <Carousel 
        className="w-full relative overflow-hidden" 
        setApi={setApi}
        opts={{
          align: "start",
          loop: subcategories.length > 4,
          dragFree: true,
          skipSnaps: false
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4 max-w-full">
          {subcategories.map(subcategory => (
            <CarouselItem key={subcategory} className="pl-2 md:pl-4 basis-1/3 md:basis-1/4 lg:basis-1/5 max-w-full overflow-hidden">
              <SubcategoryCard 
                subcategory={subcategory}
                isSelected={selectedSubcategories.includes(subcategory)}
                onToggle={() => onSubcategoryToggle(subcategory)}
                parentCategories={selectedCategories}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {subcategories.length > 4 && (
          <>
            <CarouselPrevious className="absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-8 border-0 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background/90" />
            <CarouselNext className="absolute -right-2 top-1/2 -translate-y-1/2 h-8 w-8 border-0 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background/90" />
          </>
        )}
      </Carousel>
    </div>
  );
};

const SubcategoryCard: React.FC<{
  subcategory: SubCategory;
  isSelected: boolean;
  onToggle: () => void;
  parentCategories: TopCategory[];
}> = ({ subcategory, isSelected, onToggle, parentCategories }) => {
  // Find the first parent category that contains this subcategory
  const parentCategory = parentCategories.find(category => 
    getSubcategoriesForCategory(category).includes(subcategory)
  );

  const { data: products = [] } = usePublicProducts(4, 0, parentCategory);

  // Gradient colors based on subcategory
  const getGradientColor = (sub: SubCategory) => {
    const colorMap: Record<string, string> = {
      'dresses': 'bg-gradient-to-br from-pink-500/20 to-rose-600/20',
      'abayas': 'bg-gradient-to-br from-purple-500/20 to-violet-600/20',
      'tops': 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20',
      'heels': 'bg-gradient-to-br from-emerald-500/20 to-green-600/20',
      'handbags': 'bg-gradient-to-br from-amber-500/20 to-yellow-600/20',
      'jewelry': 'bg-gradient-to-br from-indigo-500/20 to-purple-600/20',
    };
    return colorMap[sub] || 'bg-gradient-to-br from-slate-500/20 to-gray-600/20';
  };

  return (
    <Card className={cn(
      "group cursor-pointer transition-all duration-300 hover:shadow-lg border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden h-6 max-w-full",
      isSelected ? "ring-2 ring-primary shadow-lg scale-[1.02]" : "hover:shadow-md hover:scale-[1.01]"
    )}>
      <CardContent className="p-0 relative h-full max-w-full overflow-hidden">
        <Button variant="ghost" className="w-full h-full p-0 hover:bg-transparent max-w-full" onClick={onToggle}>
          <div className="w-full h-full relative overflow-hidden max-w-full">
            {/* Blank Background */}
            <div className="absolute inset-0 bg-card" />
            
            {/* Content positioned at center */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-2">
              <h4 className="font-medium text-xs text-foreground drop-shadow-lg text-center leading-tight">
                {getSubcategoryDisplayName(subcategory)}
              </h4>
            </div>
            
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                <div className="w-2 h-2 bg-primary-foreground rounded-full" />
              </div>
            )}
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubcategoryCarousel;