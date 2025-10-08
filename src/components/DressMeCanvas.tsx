import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';

interface DressMeCanvasProps {
  outfit: Record<string, WardrobeItem | null>;
  activeCategories: string[];
}

export const DressMeCanvas: React.FC<DressMeCanvasProps> = ({ outfit, activeCategories }) => {
  // Define z-index order for layering
  const layerOrder = ['bottom', 'top', 'shoes', 'accessory', 'jewelry', 'bag'];
  
  const sortedItems = activeCategories
    .filter(cat => outfit[cat])
    .sort((a, b) => layerOrder.indexOf(a) - layerOrder.indexOf(b));

  return (
    <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-background via-muted/30 to-background rounded-lg overflow-hidden border border-border shadow-lg">
      {sortedItems.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">No outfit selected</p>
            <p className="text-sm text-muted-foreground">Click shuffle to generate an outfit</p>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center p-8">
          {sortedItems.map((category) => {
            const item = outfit[category];
            if (!item) return null;

            return (
              <div
                key={category}
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: layerOrder.indexOf(category) }}
              >
                <img
                  src={item.image_bg_removed_url || item.image_url}
                  alt={category}
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
