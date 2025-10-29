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
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: layerOrder.indexOf(layer.category) }}
              >
                <img
                  src={item.image_bg_removed_url || item.image_url}
                  alt={layer.category}
                  className="max-w-full max-h-full object-contain drop-shadow-lg"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
