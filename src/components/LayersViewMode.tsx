import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { LayeredOutfitDisplay } from './LayeredOutfitDisplay';
import { AccessoriesDock } from './AccessoriesDock';
import { MiniCarouselSheet } from './MiniCarouselSheet';
import { LayerActionMenu } from './LayerActionMenu';
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
import { cn } from '@/lib/utils';

interface LayersViewModeProps {
  layers: WardrobeLayer[];
  allItems: WardrobeItem[];
  onRemoveLayer: (layerId: string) => void;
}

type CompositionMode = 'separates' | 'dress';

interface LayerState {
  category: string;
  item: WardrobeItem | null;
  items: WardrobeItem[];
  selectedIndex: number;
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

  // Composition mode
  const [mode, setMode] = useState<CompositionMode>('separates');
  
  // Get the first layer's category or default to 'top'
  const [activeCategory, setActiveCategory] = useState<string>(
    layers.length > 0 ? layers[0].category : 'top'
  );

  // Store selected items per category: { category: { itemId, index } }
  const [selectedItems, setSelectedItems] = useState<Record<string, { itemId: string; index: number } | null>>({});
  
  // Store pinned state per category
  const [pinnedCategories, setPinnedCategories] = useState<Record<string, boolean>>({});
  
  // Store hidden selections when mode switches
  const [hiddenSelections, setHiddenSelections] = useState<Record<string, { itemId: string; index: number } | null>>({});

  // Accessory sheet states
  const [isAccessorySheetOpen, setIsAccessorySheetOpen] = useState(false);
  const [isBagSheetOpen, setIsBagSheetOpen] = useState(false);

  // Save dialog state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [fitTitle, setFitTitle] = useState('');
  const [fitOccasion, setFitOccasion] = useState<string>('Casual');
  const [isPublic, setIsPublic] = useState(false);

  // Use canvas save hook
  const { saveOutfit, currentStep, progress, errorMessage, reset } = useCanvasSave();

  // Auto-switch mode when dress is selected/removed
  useEffect(() => {
    const hasDress = selectedItems['dress']?.itemId;
    const newMode: CompositionMode = hasDress ? 'dress' : 'separates';
    
    if (newMode !== mode) {
      setMode(newMode);
      
      // Store/restore selections when switching
      if (newMode === 'dress') {
        // Hide top/bottom but keep in memory
        setHiddenSelections({
          top: selectedItems['top'] || null,
          bottom: selectedItems['bottom'] || null,
        });
      } else {
        // Restore top/bottom
        if (hiddenSelections.top || hiddenSelections.bottom) {
          setSelectedItems(prev => ({
            ...prev,
            top: hiddenSelections.top || null,
            bottom: hiddenSelections.bottom || null,
          }));
        }
      }
    }
  }, [selectedItems, mode, hiddenSelections]);

  // Build layer states from wardrobe layers
  const layerStates: LayerState[] = useMemo(() => {
    return layers.map(layer => {
      const categoryItems = allItems.filter(i => i.category === layer.category);
      const selection = selectedItems[layer.category];
      const selectedIndex = selection?.index || 0;
      const item = selection?.itemId 
        ? allItems.find(i => i.id === selection.itemId) || null
        : null;

      return {
        category: layer.category,
        item,
        items: categoryItems,
        selectedIndex,
        isPinned: pinnedCategories[layer.category] || layer.is_pinned,
        zIndex: 10,
      };
    });
  }, [layers, allItems, selectedItems, pinnedCategories]);

  // Determine visible layers based on mode
  const visibleLayers = useMemo(() => {
    if (mode === 'dress') {
      return layerStates.filter(l => ['dress', 'shoes', 'accessory', 'bag', 'outerwear'].includes(l.category));
    } else {
      return layerStates.filter(l => ['top', 'bottom', 'outerwear', 'shoes', 'accessory', 'bag'].includes(l.category));
    }
  }, [mode, layerStates]);

  // Visible categories for pills
  const visibleCategories = useMemo(() => {
    const visibleCats = visibleLayers.map(l => l.category);
    return allCategories.filter(cat => visibleCats.includes(cat.value) && !['accessory', 'bag'].includes(cat.value));
  }, [visibleLayers]);

  // Handle item change from carousel track
  const handleItemChange = (category: string, item: WardrobeItem, index: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [category]: { itemId: item.id, index },
    }));
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
    const newSelected: Record<string, { itemId: string; index: number } | null> = { ...selectedItems };
    
    visibleLayers.forEach(layer => {
      if (!pinnedCategories[layer.category] && layer.items.length > 0) {
        const randomIndex = Math.floor(Math.random() * layer.items.length);
        const randomItem = layer.items[randomIndex];
        newSelected[layer.category] = { itemId: randomItem.id, index: randomIndex };
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

  // Accessory/Bag handlers
  const handleAccessorySelect = (item: WardrobeItem) => {
    const items = allItems.filter(i => i.category === 'accessory');
    const index = items.findIndex(i => i.id === item.id);
    setSelectedItems(prev => ({
      ...prev,
      accessory: { itemId: item.id, index: index >= 0 ? index : 0 },
    }));
  };

  const handleBagSelect = (item: WardrobeItem) => {
    const items = allItems.filter(i => i.category === 'bag');
    const index = items.findIndex(i => i.id === item.id);
    setSelectedItems(prev => ({
      ...prev,
      bag: { itemId: item.id, index: index >= 0 ? index : 0 },
    }));
  };

  const handleRemoveAccessory = () => {
    setSelectedItems(prev => ({ ...prev, accessory: null }));
  };

  const handleRemoveBag = () => {
    setSelectedItems(prev => ({ ...prev, bag: null }));
  };

  // Handle save outfit
  const handleSave = async () => {
    // Filter layers with items
    const itemsToSave = visibleLayers.filter(l => l.item);
    
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
      'outerwear': 55,
      'top': 50,
      'dress': 45,
      'bottom': 40,
      'bag': 35,
      'shoes': 30,
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
    const outfitState = visibleLayers
      .filter(l => l.item)
      .map(l => ({ category: l.category, itemId: l.item!.id }));
    
    sessionStorage.setItem('dressme_outfit_state', JSON.stringify(outfitState));
    navigate('/dressme/canvas');
  };

  const hasItems = visibleLayers.some(l => l.item);
  const activeLayerHasItem = selectedItems[activeCategory]?.itemId;

  // Get accessory/bag items
  const accessoryItems = allItems.filter(i => i.category === 'accessory');
  const bagItems = allItems.filter(i => i.category === 'bag');
  const selectedAccessory = selectedItems['accessory']?.itemId 
    ? allItems.find(i => i.id === selectedItems['accessory']?.itemId) || null
    : null;
  const selectedBag = selectedItems['bag']?.itemId
    ? allItems.find(i => i.id === selectedItems['bag']?.itemId) || null
    : null;

  return (
    <div className="layers-view fixed inset-0 overflow-hidden bg-background">
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
      <LayeredOutfitDisplay 
        layers={visibleLayers} 
        activeCategory={activeCategory}
        onItemChange={handleItemChange}
      />

      {/* Floating Category Pills */}
      {visibleCategories.length > 0 && (
        <div className="fixed bottom-[20px] left-1/2 -translate-x-1/2 z-50">
          <div className="flex gap-2 bg-background/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-border">
            {visibleCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={cn(
                  "px-4 py-1.5 rounded-full font-semibold text-xs transition-all",
                  activeCategory === cat.value
                    ? "bg-[#7A143E] text-white shadow-md"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Accessories Dock */}
      <AccessoriesDock
        selectedAccessory={selectedAccessory}
        selectedBag={selectedBag}
        onAccessoryTap={() => setIsAccessorySheetOpen(true)}
        onBagTap={() => setIsBagSheetOpen(true)}
        onRemoveAccessory={handleRemoveAccessory}
        onRemoveBag={handleRemoveBag}
      />

      {/* Right Action Menu */}
      <div className="fixed right-4 top-[calc(50%-140px)] z-[90]">
        <LayerActionMenu
          isPinned={pinnedCategories[activeCategory] || false}
          onPin={handlePin}
          onShuffle={handleShuffle}
          onDelete={handleDelete}
          onSave={() => setIsSaveModalOpen(true)}
          onMoveToCanvas={handleMoveToCanvas}
          disabled={!activeLayerHasItem}
          hasItems={hasItems}
        />
      </div>

      {/* Accessory Mini Carousel Sheet */}
      <MiniCarouselSheet
        open={isAccessorySheetOpen}
        onOpenChange={setIsAccessorySheetOpen}
        title="Select Accessory"
        items={accessoryItems}
        selectedItemId={selectedItems['accessory']?.itemId || null}
        onSelect={handleAccessorySelect}
      />

      {/* Bag Mini Carousel Sheet */}
      <MiniCarouselSheet
        open={isBagSheetOpen}
        onOpenChange={setIsBagSheetOpen}
        title="Select Bag"
        items={bagItems}
        selectedItemId={selectedItems['bag']?.itemId || null}
        onSelect={handleBagSelect}
      />

      {/* Save Dialog */}
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
