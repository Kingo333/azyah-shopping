import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

interface WardrobeLayerThumbnailCarouselProps {
  activeLayer: WardrobeLayer | null;
  items: WardrobeItem[];
  selectedItemId: string | null;
  onItemSelect: (item: WardrobeItem) => void;
  onPrevLayer: () => void;
  onNextLayer: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export const WardrobeLayerThumbnailCarousel: React.FC<WardrobeLayerThumbnailCarouselProps> = ({
  activeLayer,
  items,
  selectedItemId,
  onItemSelect,
  onPrevLayer,
  onNextLayer,
  canGoPrev,
  canGoNext,
}) => {
  if (!activeLayer) {
    return (
      <div className="w-full py-8 text-center">
        <p className="text-sm text-muted-foreground">No layers available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Layer Navigation Header */}
      <div className="flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevLayer}
          disabled={!canGoPrev}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <h3 className="text-sm font-semibold capitalize">{activeLayer.category}</h3>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextLayer}
          disabled={!canGoNext}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Thumbnail Carousel */}
      {items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No items in this layer</p>
        </div>
      ) : (
        <Carousel
          opts={{
            align: "center",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {items.map((item) => {
              const isSelected = item.id === selectedItemId;
              
              return (
                <CarouselItem key={item.id} className="basis-1/3 sm:basis-1/4 md:basis-1/5 pl-2 md:pl-4">
                  <button
                    onClick={() => onItemSelect(item)}
                    className={`
                      relative w-full aspect-square rounded-xl overflow-hidden
                      transition-all duration-200 hover:scale-105
                      ${isSelected 
                        ? 'ring-2 ring-primary shadow-lg scale-105' 
                        : 'ring-1 ring-border hover:ring-primary/50'
                      }
                    `}
                  >
                    <img
                      src={item.image_url}
                      alt={item.category}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/10" />
                    )}
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  );
};
