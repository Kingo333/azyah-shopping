import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';

interface WardrobeLayerScrollViewProps {
  activeLayer: WardrobeLayer | null;
  items: WardrobeItem[];
  selectedItemId: string | null;
  onItemSelect: (item: WardrobeItem) => void;
  onPrevLayer: () => void;
  onNextLayer: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  allSelectedItems: Record<string, WardrobeItem | null>;
}

export const WardrobeLayerScrollView: React.FC<WardrobeLayerScrollViewProps> = ({
  activeLayer,
  items,
  selectedItemId,
  onItemSelect,
  onPrevLayer,
  onNextLayer,
  canGoPrev,
  canGoNext,
  allSelectedItems,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [centeredItemId, setCenteredItemId] = useState<string | null>(selectedItemId);

  // Layer order for z-index
  const layerOrder = ['bottom', 'top', 'dress', 'shoes', 'accessory', 'jewelry', 'bag'];

  // Get all selected items sorted by layer order for mannequin display
  const sortedLayers = Object.entries(allSelectedItems)
    .filter(([_, item]) => item !== null)
    .sort(([categoryA], [categoryB]) => 
      layerOrder.indexOf(categoryA) - layerOrder.indexOf(categoryB)
    );

  // Scroll to selected item on mount or when it changes
  useEffect(() => {
    if (!scrollContainerRef.current || !selectedItemId) return;

    const container = scrollContainerRef.current;
    const selectedElement = container.querySelector(`[data-item-id="${selectedItemId}"]`);
    
    if (selectedElement instanceof HTMLElement) {
      const elementRect = selectedElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollLeft = selectedElement.offsetLeft - (containerRect.width / 2) + (elementRect.width / 2);
      
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedItemId]);

  // Track centered item while scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;

      let closestItem: HTMLElement | null = null;
      let closestDistance = Infinity;

      const itemElements = container.querySelectorAll('[data-item-id]');
      itemElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(centerX - itemCenterX);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestItem = element as HTMLElement;
        }
      });

      if (closestItem) {
        const itemId = closestItem.dataset.itemId;
        if (itemId && itemId !== centeredItemId) {
          setCenteredItemId(itemId);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [centeredItemId]);

  // Update selection when centered item changes (debounced)
  useEffect(() => {
    if (!centeredItemId || centeredItemId === selectedItemId) return;

    const timer = setTimeout(() => {
      const item = items.find(i => i.id === centeredItemId);
      if (item) {
        onItemSelect(item);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [centeredItemId, selectedItemId, items, onItemSelect]);

  if (!activeLayer) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No layers available</p>
      </div>
    );
  }

  const centeredItem = items.find(i => i.id === (centeredItemId || selectedItemId));

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Layer Navigation Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevLayer}
          disabled={!canGoPrev}
          className="h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="text-center">
          <h3 className="text-lg font-semibold capitalize">{activeLayer.category}</h3>
          <p className="text-sm text-muted-foreground">{items.length} items</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextLayer}
          disabled={!canGoNext}
          className="h-10 w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Mannequin Preview with All Layers */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {sortedLayers.map(([category, item]) => {
          if (!item) return null;
          
          // Highlight the active layer's centered item
          const isActiveLayer = category === activeLayer.category;
          const isCentered = isActiveLayer && item.id === (centeredItemId || selectedItemId);
          
          return (
            <div
              key={category}
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              style={{ 
                zIndex: layerOrder.indexOf(category),
                opacity: isCentered ? 1 : 0.7
              }}
            >
              <img
                src={item.image_bg_removed_url || item.image_url}
                alt={category}
                className="max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl"
              />
            </div>
          );
        })}
      </div>

      {/* Scrolling Items */}
      {items.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">No items in this layer</p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="layer-scroll-container absolute inset-0 overflow-x-auto overflow-y-hidden"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex items-center h-full" style={{ paddingLeft: '50%', paddingRight: '50%' }}>
            {items.map((item, index) => {
              const isCentered = item.id === (centeredItemId || selectedItemId);
              
              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  className="layer-scroll-item flex-shrink-0 transition-all duration-300"
                  style={{
                    scrollSnapAlign: 'center',
                    width: '280px',
                    opacity: isCentered ? 0.3 : 0.6,
                    transform: isCentered ? 'scale(1.1)' : 'scale(0.9)',
                  }}
                  onClick={() => onItemSelect(item)}
                >
                  <div className="h-full flex items-center justify-center p-4">
                    <img
                      src={item.image_bg_removed_url || item.image_url}
                      alt="Wardrobe item"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
