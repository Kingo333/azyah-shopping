import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Palette, Plus, Smile, Droplet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedInteractiveCanvas, CanvasLayer } from '@/components/EnhancedInteractiveCanvas';
import { BackgroundPicker } from '@/components/BackgroundPicker';
import { CanvasBottomToolbar } from '@/components/CanvasBottomToolbar';
import { WardrobeUploadModal } from '@/components/WardrobeUploadModal';
import { useWardrobeItems, WardrobeItem } from '@/hooks/useWardrobeItems';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDressMeAnalytics } from '@/hooks/useDressMeAnalytics';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WardrobeThumbnailRail } from '@/components/WardrobeThumbnailRail';
import { supabase } from '@/integrations/supabase/client';
import { useCanvasSave } from '@/hooks/useCanvasSave';
import { SaveProgressModal } from '@/components/SaveProgressModal';

export default function DressMeCanvas() {
  const navigate = useNavigate();
  const { data: allItems = [] } = useWardrobeItems();
  const analytics = useDressMeAnalytics();
  const { saveOutfit, currentStep, progress, errorMessage, reset } = useCanvasSave();

  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [background, setBackground] = useState<{ type: 'solid' | 'gradient' | 'pattern' | 'image'; value: string }>({ 
    type: 'solid', 
    value: '#FFFFFF' 
  });
  
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [isWardrobeSheetOpen, setIsWardrobeSheetOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [fitTitle, setFitTitle] = useState('');
  const [fitOccasion, setFitOccasion] = useState<string>('Casual');
  const [isPublic, setIsPublic] = useState(false);

  // Load selected items or fit on mount - DON'T auto-load from autosave
  useEffect(() => {
    const selectedItemsStr = sessionStorage.getItem('dressme_selected_items');
    const loadFitId = sessionStorage.getItem('dressme_load_fit');

    if (loadFitId) {
      // Load existing fit
      loadFit(loadFitId);
      sessionStorage.removeItem('dressme_load_fit');
    } else if (selectedItemsStr) {
      // Load selected items
      try {
        const selectedIds = JSON.parse(selectedItemsStr);
        const selectedItems = allItems.filter(item => selectedIds.includes(item.id));
        
        const newLayers: CanvasLayer[] = selectedItems.map((item, index) => ({
          id: `layer-${Date.now()}-${index}`,
          wardrobeItem: item,
          transform: {
            x: 200 + (index * 20),
            y: 150 + (index * 20),
            scale: 1,
            rotation: 0,
          },
          opacity: 1,
          flipH: false,
          visible: true,
          zIndex: index,
        }));
        
        setLayers(newLayers);
        sessionStorage.removeItem('dressme_selected_items');
      } catch (e) {
        console.error('Failed to load selected items:', e);
      }
    }
    // Removed auto-load from autosave - canvas starts empty
  }, [allItems]);

  // Autosave to localStorage
  useEffect(() => {
    if (layers.length > 0) {
      localStorage.setItem('dressme_autosave', JSON.stringify({ layers, background }));
    }
  }, [layers, background]);

  const loadFit = async (fitId: string) => {
    try {
      const { data: fitData, error } = await supabase
        .from('fits')
        .select('*')
        .eq('id', fitId)
        .single();

      if (error) throw error;

      const canvasJson = fitData.canvas_json as any;
      const itemIds = canvasJson.layers.map((l: any) => l.wardrobeItemId);
      
      const { data: items } = await supabase
        .from('wardrobe_items')
        .select('*')
        .in('id', itemIds);

      if (!items) return;

      const reconstructedLayers: CanvasLayer[] = canvasJson.layers.map((layerData: any) => {
        const item = items.find(i => i.id === layerData.wardrobeItemId);
        if (!item) return null;

        return {
          id: `layer-${Date.now()}-${Math.random()}`,
          wardrobeItem: item as WardrobeItem,
          transform: layerData.transform,
          opacity: layerData.opacity || 1,
          flipH: layerData.flipH || false,
          visible: layerData.visible !== false,
          zIndex: layerData.zIndex,
        };
      }).filter(Boolean);

      setLayers(reconstructedLayers);
      setBackground(canvasJson.background);
      toast.success('Outfit loaded');
    } catch (error) {
      console.error('Error loading fit:', error);
      toast.error('Failed to load outfit');
    }
  };

  const handleAddItemToCanvas = useCallback((item: WardrobeItem) => {
    const isDuplicate = layers.some(layer => layer.wardrobeItem.id === item.id);
    if (isDuplicate) {
      toast.info('Item is already on the canvas');
      return;
    }

    const newLayer: CanvasLayer = {
      id: `layer-${Date.now()}-${Math.random()}`,
      wardrobeItem: item,
      transform: {
        x: 300,
        y: 200,
        scale: 1,
        rotation: 0,
      },
      opacity: 1,
      flipH: false,
      visible: true,
      zIndex: layers.length,
    };
    
    setLayers([...layers, newLayer]);
    analytics.addItem(item.id);
    setIsWardrobeSheetOpen(false);
  }, [layers, analytics]);

  const handleSave = async () => {
    if (layers.length === 0) {
      toast.error('Please add items to your outfit first');
      return;
    }

    // Close the save modal and show progress modal
    setIsSaveModalOpen(false);
    
    // Start the save process
    await saveOutfit({
      layers,
      background,
      title: fitTitle || undefined,
      occasion: fitOccasion,
      isPublic,
    });

    // Track analytics on success
    if (currentStep === 'success') {
      analytics.saveFit('saved', isPublic);
    }

    // Reset form
    setFitTitle('');
    setFitOccasion('Casual');
    setIsPublic(false);
  };

  const handleItemAdded = useCallback((itemId: string) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) {
      handleAddItemToCanvas(item);
    }
  }, [allItems, handleAddItemToCanvas]);

  return (
    <>
      <SEOHead
        title="Canvas Editor - Dress Me | Azyah"
        description="Create and customize your outfit combinations"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dress-me/wardrobe')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsSaveModalOpen(true)}
              disabled={layers.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-screen bg-background pb-32">
        <div className="container max-w-6xl mx-auto p-4">
          <EnhancedInteractiveCanvas
            layers={layers}
            onLayersChange={setLayers}
            background={background}
            selectedLayerId={selectedLayerId}
            onSelectedLayerIdChange={setSelectedLayerId}
          />
        </div>
      </div>

      {/* Bottom Toolbar */}
      <CanvasBottomToolbar
        onAddClothes={() => setIsWardrobeSheetOpen(true)}
        onStickers={() => toast.info('Stickers coming soon!')}
        onBackground={() => setIsBackgroundPickerOpen(true)}
      />

      {/* Wardrobe Sheet */}
      <Sheet open={isWardrobeSheetOpen} onOpenChange={setIsWardrobeSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>All Items</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSelectedLayerId(null)}
                  variant="outline"
                  size="sm"
                >
                  Select
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsWardrobeSheetOpen(false);
                    setIsUploadModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Layer
                </Button>
                {selectedLayerId && (
                  <Button
                    onClick={() => {
                      setLayers(layers.filter(l => l.id !== selectedLayerId));
                      setSelectedLayerId(null);
                    }}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto h-[calc(100%-60px)]">
            <WardrobeThumbnailRail
              items={allItems}
              onSelectItem={handleAddItemToCanvas}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Background Picker */}
      <BackgroundPicker
        isOpen={isBackgroundPickerOpen}
        onClose={() => setIsBackgroundPickerOpen(false)}
        onSelect={setBackground}
        currentBackground={background}
      />

      {/* Upload Modal */}
      <WardrobeUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onItemAdded={handleItemAdded}
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
        onClose={() => {
          reset();
          if (currentStep === 'success') {
            navigate('/dress-me/wardrobe?tab=outfits');
          }
        }}
      />
    </>
  );
}
