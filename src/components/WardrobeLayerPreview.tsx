import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';

interface WardrobeLayerPreviewProps {
  layers: WardrobeLayer[];
  selectedItems: Record<string, WardrobeItem | null>;
}

export const WardrobeLayerPreview: React.FC<WardrobeLayerPreviewProps> = ({
  layers,
  selectedItems,
}) => {
  // Define z-index order for proper layering
  const layerOrder = ['bottom', 'top', 'dress', 'shoes', 'accessory', 'jewelry', 'bag'];
  
  // Define vertical positioning zones based on category
  const getVerticalPosition = (category: string) => {
    const topZone = ['top', 'dress', 'jacket', 'outerwear', 'blazer', 'coat', 'tops', 'blouses', 'shirts'];
    const middleZone = ['bottom', 'pants', 'jeans', 'skirt', 'shorts', 'trousers'];
    const bottomZone = ['shoes', 'footwear', 'boots', 'sneakers', 'heels', 'flats', 'sandals'];
    
    if (topZone.includes(category.toLowerCase())) {
      return 'top-[8%]';
    } else if (middleZone.includes(category.toLowerCase())) {
      return 'top-[35%]';
    } else if (bottomZone.includes(category.toLowerCase())) {
      return 'top-[65%]';
    }
    return 'top-1/2 -translate-y-1/2'; // Fallback to center
  };
  
  const sortedLayers = layers
    .filter(layer => selectedItems[layer.category])
    .sort((a, b) => layerOrder.indexOf(a.category) - layerOrder.indexOf(b.category));

  return (
    <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-background via-muted/20 to-background rounded-2xl overflow-hidden border border-border shadow-sm">
      {sortedLayers.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-muted-foreground">No items selected</p>
            <p className="text-sm text-muted-foreground">Select items below to build your outfit</p>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center p-8">
          {sortedLayers.map((layer) => {
            const item = selectedItems[layer.category];
            if (!item) return null;

            return (
              <div
                key={layer.id}
                className={`absolute inset-x-0 flex justify-center ${getVerticalPosition(layer.category)}`}
                style={{ zIndex: layerOrder.indexOf(layer.category) }}
              >
                <img
                  src={item.image_bg_removed_url || item.image_url}
                  alt={layer.category}
                  className="max-h-[30%] object-contain drop-shadow-lg"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
