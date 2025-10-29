import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { LayerTrack } from './LayerTrack';

interface LayerState {
  category: string;
  item: WardrobeItem | null;
  items: WardrobeItem[];
  selectedIndex: number;
  isPinned: boolean;
  zIndex: number;
}

interface LayeredOutfitDisplayProps {
  layers: LayerState[];
  activeCategory: string;
  onItemChange: (category: string, item: WardrobeItem, index: number) => void;
}

// Define z-index for each category
const CATEGORY_Z_INDEX: Record<string, number> = {
  'headwear': 60,
  'accessory': 58,
  'outerwear': 55,
  'top': 50,
  'dress': 45,
  'bottom': 40,
  'bag': 35,
  'shoes': 30,
};

export const LayeredOutfitDisplay: React.FC<LayeredOutfitDisplayProps> = ({ 
  layers, 
  activeCategory,
  onItemChange 
}) => {
  return (
    <div className="composition-canvas absolute inset-0 overflow-hidden">
      {/* Optional mannequin background */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <div 
          className="w-48 h-[70vh] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(ellipse, rgba(122, 20, 62, 0.3) 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Layer tracks - Show ALL layers regardless of item selection */}
      {layers.map((layer) => (
        <LayerTrack
          key={layer.category}
          category={layer.category}
          items={layer.items}
          selectedIndex={layer.selectedIndex}
          isPinned={layer.isPinned}
          isActive={activeCategory === layer.category}
          onItemChange={(item, index) => onItemChange(layer.category, item, index)}
          zIndex={CATEGORY_Z_INDEX[layer.category] || 20}
        />
      ))}
    </div>
  );
};
