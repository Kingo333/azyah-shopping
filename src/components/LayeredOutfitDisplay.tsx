import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Lock } from 'lucide-react';
import { useLayerScaling } from '@/hooks/useLayerScaling';

interface LayerState {
  category: string;
  item: WardrobeItem | null;
  isPinned: boolean;
  zIndex: number;
}

interface LayeredOutfitDisplayProps {
  layers: LayerState[];
}

// Define z-index for each category
const CATEGORY_Z_INDEX: Record<string, number> = {
  'accessory': 60,
  'top': 50,
  'dress': 45,
  'outerwear': 55,
  'bottom': 40,
  'shoes': 30,
  'bag': 20,
};

export const LayeredOutfitDisplay: React.FC<LayeredOutfitDisplayProps> = ({ layers }) => {
  const activeLayers = layers.filter(l => l.item);
  const { maxItemHeight } = useLayerScaling(activeLayers.length);

  return (
    <div className="layers-display-container fixed top-[60px] left-0 right-0 bottom-[196px] flex items-center justify-center overflow-hidden">
      {activeLayers.length === 0 ? (
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">No items in outfit</p>
          <p className="text-sm text-muted-foreground">Select a category below to add items</p>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          {activeLayers.map((layer) => {
            if (!layer.item) return null;

            const zIndex = CATEGORY_Z_INDEX[layer.category] || 10;

            return (
              <div
                key={layer.category}
                className="absolute inset-0 flex items-center justify-center layer-item-wrapper"
                style={{ zIndex }}
              >
                <div className="relative">
                  <img
                    src={layer.item.image_bg_removed_url || layer.item.image_url}
                    alt={layer.category}
                    className="layer-item-image object-contain transition-all duration-300"
                    style={{
                      maxHeight: `${maxItemHeight}px`,
                      maxWidth: '90vw',
                      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
                    }}
                    loading="lazy"
                  />
                  {layer.isPinned && (
                    <div className="absolute top-2 right-2 bg-[#7A143E] text-white p-1.5 rounded-full shadow-lg animate-scale-in">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
