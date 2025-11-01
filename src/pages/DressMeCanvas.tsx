import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Palette, Plus, Smile, Droplet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NormalizedCanvas } from '@/components/NormalizedCanvas';
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
import { useCanvasScene } from '@/hooks/useCanvasScene';
import type { CanvasScene } from '@/types/canvas';

export default function DressMeCanvas() {
  const navigate = useNavigate();
  const { data: allItems = [] } = useWardrobeItems();
  const analytics = useDressMeAnalytics();
  const { saveOutfit, currentStep, progress, errorMessage, reset } = useCanvasSave();
  const { scene, setScene, addItem, updateItem, deleteItem, setBackground, clearAutosave } = useCanvasScene();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [isWardrobeSheetOpen, setIsWardrobeSheetOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [fitTitle, setFitTitle] = useState('');
  const [fitOccasion, setFitOccasion] = useState<string>('Casual');
  const [isPublic, setIsPublic] = useState(false);

  // Load selected items or fit on mount
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
        
        selectedItems.forEach(item => addItem(item));
        sessionStorage.removeItem('dressme_selected_items');
      } catch (e) {
        console.error('Failed to load selected items:', e);
      }
    }
  }, [allItems, addItem]);

  const loadFit = async (fitId: string) => {
    try {
      const { data: fitData, error } = await supabase
        .from('fits')
        .select('*')
        .eq('id', fitId)
        .single();

      if (error) throw error;

      const canvasJson = fitData.canvas_json as any;
      
      // Check if it's already in normalized format
      if (canvasJson.version === 1 && canvasJson.items) {
        setScene(canvasJson as CanvasScene);
      } else {
        // Legacy format - need to migrate
        const itemIds = canvasJson.layers?.map((l: any) => l.wardrobeItemId) || [];
        
        const { data: items } = await supabase
          .from('wardrobe_items')
          .select('*')
          .in('id', itemIds);

        if (!items) return;

        // Rebuild scene from legacy format
        const migratedItems = await Promise.all(
          (canvasJson.layers || []).map(async (layerData: any) => {
            const item = items.find(i => i.id === layerData.wardrobeItemId);
            if (!item) return null;

            const src = item.image_bg_removed_url || item.image_url;
            const img = new Image();
            await new Promise((res) => { img.onload = res; img.src = src; });

            return {
              id: `item-${Date.now()}-${Math.random()}`,
              src,
              wardrobeItemId: item.id,
              x: (layerData.transform.x || 540) / 1080,
              y: (layerData.transform.y || 960) / 1920,
              w: 0.25 * (layerData.transform.scale || 1),
              h: 0.25 * (layerData.transform.scale || 1) * ((img.naturalHeight || 1000) / (img.naturalWidth || 1000)) * (1080 / 1920),
              naturalW: img.naturalWidth || 1000,
              naturalH: img.naturalHeight || 1000,
              rotation: layerData.transform.rotation || 0,
              scaleX: layerData.flipH ? -1 : 1,
              scaleY: 1,
              flipX: layerData.flipH || false,
              flipY: false,
              opacity: layerData.opacity || 1,
              z: layerData.zIndex,
              visible: layerData.visible !== false,
              locked: false,
            };
          })
        );

        setScene({
          version: 1,
          stageWidth: 1080,
          stageHeight: 1920,
          items: migratedItems.filter(Boolean) as any,
          background: canvasJson.background || { type: 'solid', value: '#FFFFFF' },
        });
      }
      
      toast.success('Outfit loaded');
    } catch (error) {
      console.error('Error loading fit:', error);
      toast.error('Failed to load outfit');
    }
  };

  const handleAddItemToCanvas = useCallback(async (item: WardrobeItem) => {
    const isDuplicate = scene.items.some(sceneItem => sceneItem.wardrobeItemId === item.id);
    if (isDuplicate) {
      toast.info('Item is already on the canvas');
      return;
    }

    await addItem(item);
    analytics.addItem(item.id);
    setIsWardrobeSheetOpen(false);
  }, [scene.items, addItem, analytics]);

  const handleSave = async () => {
    if (scene.items.length === 0) {
      toast.error('Please add items to your outfit first');
      return;
    }

    // Close the save modal and show progress modal
    setIsSaveModalOpen(false);
    
    // Start the save process
    await saveOutfit({
      scene,
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
      
      <div 
        className="flex flex-col bg-background"
        style={{
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div 
          className="z-40 bg-background/95 backdrop-blur-sm border-b flex-shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="container max-w-6xl mx-auto p-2 md:p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dress-me/wardrobe')}
              >
                <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
                <span className="text-xs md:text-sm">Back</span>
              </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsSaveModalOpen(true)}
                  disabled={scene.items.length === 0}
                >
                  <Save className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="text-xs md:text-sm">Save</span>
                </Button>
            </div>
          </div>
        </div>

        {/* Canvas - grows to fill available space */}
        <div 
          className="flex-1 flex items-center justify-center bg-background overflow-hidden min-h-0"
          style={{
            paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
          }}
        >
          <div className="w-full h-full max-w-6xl px-1 md:px-4">
            <NormalizedCanvas
              scene={scene}
              onSceneChange={setScene}
              selectedItemId={selectedItemId}
              onSelectedItemIdChange={setSelectedItemId}
            />
          </div>
        </div>

        {/* Bottom Toolbar */}
        <CanvasBottomToolbar
          onAddClothes={() => setIsWardrobeSheetOpen(true)}
          onStickers={() => toast.info('Stickers coming soon!')}
          onBackground={() => setIsBackgroundPickerOpen(true)}
        />
      </div>

      {/* Wardrobe Sheet */}
      <Sheet open={isWardrobeSheetOpen} onOpenChange={setIsWardrobeSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>All Items</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSelectedItemId(null)}
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
                {selectedItemId && (
                  <Button
                    onClick={() => {
                      deleteItem(selectedItemId);
                      setSelectedItemId(null);
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
        currentBackground={scene.background}
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
