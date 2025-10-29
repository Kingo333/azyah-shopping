import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { LayeredOutfitDisplay } from './LayeredOutfitDisplay';
import { LayerCarousel } from './LayerCarousel';
import { CategoryBottomBar } from './CategoryBottomBar';
import { LayerActionMenu } from './LayerActionMenu';
import { useCarouselMemory } from '@/hooks/useCarouselMemory';
import { BackButton } from './ui/back-button';
import { Button } from './ui/button';

interface LayersViewModeProps {
  layers: WardrobeLayer[];
  allItems: WardrobeItem[];
  onRemoveLayer: (layerId: string) => void;
}

interface LayerState {
  category: string;
  item: WardrobeItem | null;
  isPinned: boolean;
  zIndex: number;
}

const allCategories = [
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'dress', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'bag', label: 'Bags' },
  { value: 'accessory', label: 'Accessories' },
];

export const LayersViewMode: React.FC<LayersViewModeProps> = ({
  layers,
  allItems,
  onRemoveLayer,
}) => {
  const navigate = useNavigate();
  const { savePosition, getPosition } = useCarouselMemory();

  // Get the first layer's category or default to 'top'
  const [activeCategory, setActiveCategory] = useState<string>(
    layers.length > 0 ? layers[0].category : 'top'
  );

  // Store selected items per category in local state
  const [selectedItems, setSelectedItems] = useState<Record<string, string | null>>({});
  
  // Store pinned state per category
  const [pinnedCategories, setPinnedCategories] = useState<Record<string, boolean>>({});

  // Build layer states from wardrobe layers
  const layerStates: LayerState[] = useMemo(() => {
    return layers.map(layer => {
      const itemId = selectedItems[layer.category];
      const item = itemId 
        ? allItems.find(i => i.id === itemId) || null
        : null;

      return {
        category: layer.category,
        item,
        isPinned: pinnedCategories[layer.category] || layer.is_pinned,
        zIndex: 10,
      };
    });
  }, [layers, allItems, selectedItems, pinnedCategories]);

  // Get items for the active category carousel
  const activeCategoryItems = useMemo(() => {
    return allItems.filter(item => item.category === activeCategory);
  }, [allItems, activeCategory]);

  // Get current item ID for active category
  const currentItemId = selectedItems[activeCategory] || null;

  // Handle item selection from carousel
  const handleItemSelect = (item: WardrobeItem, index: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [activeCategory]: item.id,
    }));

    // Save carousel position
    savePosition(activeCategory, index);
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  // Handle pin toggle
  const handlePin = () => {
    setPinnedCategories(prev => ({
      ...prev,
      [activeCategory]: !prev[activeCategory],
    }));
  };

  // Handle shuffle (randomize unpinned items)
  const handleShuffle = () => {
    const newSelected: Record<string, string | null> = { ...selectedItems };
    
    layers.forEach(layer => {
      if (!pinnedCategories[layer.category]) {
        const categoryItems = allItems.filter(i => i.category === layer.category);
        if (categoryItems.length > 0) {
          const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
          newSelected[layer.category] = randomItem.id;
        }
      }
    });
    
    setSelectedItems(newSelected);
  };

  // Handle delete current item from outfit
  const handleDelete = () => {
    setSelectedItems(prev => ({
      ...prev,
      [activeCategory]: null,
    }));
  };

  // Handle go to canvas
  const handleMoveToCanvas = () => {
    // Store current outfit state in session storage
    const outfitState = layerStates
      .filter(l => l.item)
      .map(l => ({ category: l.category, itemId: l.item!.id }));
    
    sessionStorage.setItem('dressme_outfit_state', JSON.stringify(outfitState));
    navigate('/dressme/canvas');
  };

  // Filter categories to only show those with layers
  const availableCategories = allCategories.filter(cat => 
    layers.some(l => l.category === cat.value)
  );

  const hasItems = layerStates.some(l => l.item);

  return (
    <div className="layers-view">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-[60px] bg-background border-b border-border z-50 flex items-center justify-between px-4 pt-safe">
        <BackButton />
        <h1 className="text-lg font-semibold">Outfit Builder</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMoveToCanvas}
          disabled={!hasItems}
          className="h-8 px-3 text-xs"
        >
          Canvas
        </Button>
      </div>

      {/* Centered Outfit Display */}
      <LayeredOutfitDisplay layers={layerStates} />

      {/* Category Bottom Bar */}
      {availableCategories.length > 0 && (
        <CategoryBottomBar
          categories={availableCategories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {/* Bottom Carousel */}
      <LayerCarousel
        items={activeCategoryItems}
        currentItemId={currentItemId}
        onItemSelect={handleItemSelect}
        scrollToIndex={getPosition(activeCategory)}
      />

      {/* Right Action Menu */}
      <LayerActionMenu
        isPinned={pinnedCategories[activeCategory] || false}
        onPin={handlePin}
        onShuffle={handleShuffle}
        onDelete={handleDelete}
        onMoveToCanvas={handleMoveToCanvas}
        disabled={!currentItemId}
      />
    </div>
  );
};
