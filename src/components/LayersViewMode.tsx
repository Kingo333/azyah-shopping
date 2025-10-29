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
import { SaveProgressModal } from './SaveProgressModal';
import { useCanvasSave } from '@/hooks/useCanvasSave';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CanvasLayer } from './EnhancedInteractiveCanvas';

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

  // Save dialog state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [fitTitle, setFitTitle] = useState('');
  const [fitOccasion, setFitOccasion] = useState<string>('Casual');
  const [isPublic, setIsPublic] = useState(false);

  // Use canvas save hook
  const { saveOutfit, currentStep, progress, errorMessage, reset } = useCanvasSave();

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

  // Handle save outfit
  const handleSave = async () => {
    // Filter layers with items
    const itemsToSave = layerStates.filter(l => l.item);
    
    if (itemsToSave.length === 0) {
      toast({ variant: 'destructive', title: 'Please select items for your outfit first' });
      return;
    }

    // Convert to CanvasLayer format
    const STAGE_WIDTH = 1080;
    const STAGE_HEIGHT = 1920;
    
    // Category-based vertical positioning
    const categoryYPositions: Record<string, number> = {
      'top': STAGE_HEIGHT * 0.35,
      'bottom': STAGE_HEIGHT * 0.55,
      'dress': STAGE_HEIGHT * 0.45,
      'outerwear': STAGE_HEIGHT * 0.35,
      'shoes': STAGE_HEIGHT * 0.75,
      'bag': STAGE_HEIGHT * 0.50,
      'accessory': STAGE_HEIGHT * 0.25,
    };
    
    // Category-based z-index
    const categoryZIndex: Record<string, number> = {
      'accessory': 60,
      'outerwear': 50,
      'top': 45,
      'dress': 44,
      'bottom': 40,
      'shoes': 30,
      'bag': 35,
    };

    const canvasLayers: CanvasLayer[] = itemsToSave.map((layerState, index) => ({
      id: `layer-${Date.now()}-${index}`,
      wardrobeItem: layerState.item!,
      transform: {
        x: STAGE_WIDTH / 2,
        y: categoryYPositions[layerState.category] || STAGE_HEIGHT / 2,
        scale: 1,
        rotation: 0,
      },
      opacity: 1,
      flipH: false,
      visible: true,
      zIndex: categoryZIndex[layerState.category] || 10,
    }));

    // Call save with canvas format
    await saveOutfit({
      layers: canvasLayers,
      background: { type: 'solid', value: '#FFFFFF' },
      title: fitTitle || undefined,
      occasion: fitOccasion,
      isPublic: isPublic,
    });

    // Close dialog
    setIsSaveModalOpen(false);
    
    // Reset form
    setFitTitle('');
    setFitOccasion('Casual');
    setIsPublic(false);
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
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!hasItems}
            className="h-8 px-3 text-xs"
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
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
        onSave={() => setIsSaveModalOpen(true)}
        onMoveToCanvas={handleMoveToCanvas}
        disabled={!currentItemId}
        hasItems={hasItems}
      />

      {/* Save Dialog - Exact same as Canvas */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Your Outfit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                value={fitTitle}
                onChange={(e) => setFitTitle(e.target.value)}
                placeholder="My awesome outfit"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Occasion</Label>
              <Select value={fitOccasion} onValueChange={setFitOccasion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Make Public</Label>
                <p className="text-xs text-muted-foreground">
                  Share with the community
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              Save Outfit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Progress Modal */}
      <SaveProgressModal
        isOpen={currentStep !== 'idle'}
        currentStep={currentStep === 'idle' ? 'preparing' : currentStep}
        progress={progress}
        errorMessage={errorMessage || undefined}
        onRetry={handleSave}
        onClose={reset}
      />
    </div>
  );
};
