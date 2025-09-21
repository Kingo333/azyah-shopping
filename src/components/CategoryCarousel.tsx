import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from '@/components/ui/carousel';
import { Home } from 'lucide-react';
import { usePublicProducts } from '@/hooks/usePublicProducts';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { cn } from '@/lib/utils';
import type { TopCategory, SubCategory } from '@/lib/categories';
import SubcategoryCarousel from '@/components/SubcategoryCarousel';

// Import default category images
const modestWearImage = '/lovable-uploads/553f6cd6-f082-43bf-bba2-79e8d824e681.png';
import clothingImage from '@/assets/category-clothing.jpg';
import bagsImage from '@/assets/category-bags.jpg';
import footwearImage from '@/assets/category-footwear.jpg';

interface CategoryCarouselProps {
  selectedCategories: TopCategory[];
  onCategoryToggle: (category: TopCategory) => void;
  selectedSubcategories?: SubCategory[];
  onSubcategoryToggle?: (subcategory: SubCategory) => void;
}
const CATEGORIES = [{
  slug: 'modestwear' as TopCategory,
  name: 'Modest Wear',
  color: 'bg-gradient-to-br from-violet-500/20 to-purple-600/20',
  defaultImage: modestWearImage
}, {
  slug: 'clothing' as TopCategory,
  name: 'Clothing',
  color: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20',
  defaultImage: clothingImage
}, {
  slug: 'bags' as TopCategory,
  name: 'Bags',
  color: 'bg-gradient-to-br from-pink-500/20 to-rose-600/20',
  defaultImage: bagsImage
}, {
  slug: 'footwear' as TopCategory,
  name: 'Footwear',
  color: 'bg-gradient-to-br from-emerald-500/20 to-green-600/20',
  defaultImage: footwearImage
}];
const CategoryCarousel: React.FC<CategoryCarouselProps> = ({
  selectedCategories,
  onCategoryToggle,
  selectedSubcategories = [],
  onSubcategoryToggle
}) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!api) return;

    const startAutoplay = () => {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (api.canScrollNext()) {
          api.scrollNext();
        } else {
          api.scrollTo(0);
        }
      }, 4000); // Auto-scroll every 4 seconds consistently
    };

    const stopAutoplay = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };

    // Start autoplay immediately
    startAutoplay();

    // Only stop on actual user interactions (not programmatic scrolling)
    api.on('pointerDown', () => {
      stopAutoplay();
      // Restart after 3 seconds of no interaction
      setTimeout(startAutoplay, 3000);
    });

    return () => {
      stopAutoplay();
    };
  }, [api]);

  return <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-playfair">Our Best Categories</h2>
        <div className="flex items-center gap-3">
          {selectedCategories.length > 0 && <Badge variant="secondary" className="text-xs">
              {selectedCategories.length} selected
            </Badge>}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg bg-background/80 backdrop-blur-sm border border-border/50"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Carousel 
        className="w-full relative overflow-hidden" 
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
          skipSnaps: false
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4 max-w-full">
          {CATEGORIES.map(category => <CarouselItem key={category.slug} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 max-w-full overflow-hidden">
              <CategoryCard category={category} isSelected={selectedCategories.includes(category.slug)} onToggle={() => onCategoryToggle(category.slug)} />
            </CarouselItem>)}
        </CarouselContent>
        <CarouselPrevious className="absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-8 border-0 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background/90" />
        <CarouselNext className="absolute -right-2 top-1/2 -translate-y-1/2 h-8 w-8 border-0 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background/90" />
      </Carousel>

      {/* Subcategory Carousel */}
      {selectedCategories.length > 0 && onSubcategoryToggle && (
        <SubcategoryCarousel
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          onSubcategoryToggle={onSubcategoryToggle}
        />
      )}
    </div>;
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
}> = ({
  category,
  isSelected,
  onToggle
}) => {
  const {
    data: products = []
  } = usePublicProducts(4, 0, category.slug);
  return <Card className={cn(
      "group cursor-pointer transition-all duration-300 hover:shadow-lg border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden h-32 md:h-36 max-w-full",
      isSelected ? "ring-2 ring-primary shadow-lg scale-[1.02]" : "hover:shadow-md hover:scale-[1.01]"
    )}>
      <CardContent className="p-0 relative h-full max-w-full overflow-hidden">
        <Button variant="ghost" className="w-full h-full p-0 hover:bg-transparent max-w-full" onClick={onToggle}>
          <div className="w-full h-full relative overflow-hidden max-w-full">
            {/* Background Thumbnail */}
            <div className="absolute inset-0">
              {products.length > 0 ? (
                <img 
                  src={getPrimaryImageUrl(products[0])} 
                  alt={products[0].title} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  onError={e => {
                    (e.target as HTMLImageElement).src = category.defaultImage;
                  }} 
                />
              ) : (
                <img 
                  src={category.defaultImage} 
                  alt={`${category.name} category`} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
              )}
              {/* Overlay gradient */}
              <div className="absolute top-0 left-0 right-0 bottom-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
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
    </Card>;
};
export default CategoryCarousel;