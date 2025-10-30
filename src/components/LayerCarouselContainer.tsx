import React from 'react';
import { SwipeableLayerCarousel } from './SwipeableLayerCarousel';
import { useLayerPositionContext } from '@/contexts/LayerPositionContext';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';

interface LayerCarouselContainerProps {
  layers: WardrobeLayer[];
  itemsByCategory: Record<string, WardrobeItem[]>;
  onItemClick: (layerId: string, itemId: string) => void;
  onPinToggle: (layerId: string, isPinned: boolean) => void;
  onRemoveLayer: (layerId: string) => void;
  onAddItem: (category: string) => void;
}

export const LayerCarouselContainer: React.FC<LayerCarouselContainerProps> = ({
  layers,
  itemsByCategory,
  onItemClick,
  onPinToggle,
  onRemoveLayer,
  onAddItem,
}) => {
  return (
    <div className="space-y-6 pb-6">
      {layers.map((layer) => (
        <SwipeableLayerCarousel
          key={layer.id}
          layer={layer}
          items={itemsByCategory[layer.category] || []}
          onItemClick={(itemId) => onItemClick(layer.id, itemId)}
          onPinToggle={() => onPinToggle(layer.id, layer.is_pinned)}
          onRemoveLayer={() => onRemoveLayer(layer.id)}
          onAddItem={() => onAddItem(layer.category)}
        />
      ))}
    </div>
  );
};
