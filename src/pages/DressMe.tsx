import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Share2, Upload, Palette, Layers } from 'lucide-react';
import { EnhancedInteractiveCanvas, CanvasLayer } from '@/components/EnhancedInteractiveCanvas';
import { CategoryChips } from '@/components/CategoryChips';
import { WardrobeThumbnailRail } from '@/components/WardrobeThumbnailRail';
import { BackgroundPicker } from '@/components/BackgroundPicker';
import { WardrobeUploadModal } from '@/components/WardrobeUploadModal';
import { useWardrobeItems, WardrobeItem } from '@/hooks/useWardrobeItems';
import { useSaveFit, usePublicFits } from '@/hooks/useFits';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PublicFitsGrid } from '@/components/PublicFitsGrid';
import { FitDetailsModal } from '@/components/FitDetailsModal';
import { useDressMeAnalytics } from '@/hooks/useDressMeAnalytics';
import { renderCanvasToBase64 } from '@/utils/canvasToImage';
import { BackButton } from '@/components/ui/back-button';
import { Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function DressMe() {
  const { data: allItems = [], isLoading } = useWardrobeItems();
  const { data: publicFits = [] } = usePublicFits();
  const saveFit = useSaveFit();
  const analytics = useDressMeAnalytics();

  // State
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'closet' | 'community'>('closet');
  const [background, setBackground] = useState<{ type: 'solid' | 'gradient' | 'pattern' | 'image'; value: string }>({ 
    type: 'solid', 
    value: 'hsl(var(--muted))' 
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [fitTitle, setFitTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedPublicFit, setSelectedPublicFit] = useState<any>(null);
  const [isFitDetailsOpen, setIsFitDetailsOpen] = useState(false);

  // Track page open and local autosave
  useEffect(() => {
    analytics.open();

    // Load autosaved canvas from localStorage
    const autosaved = localStorage.getItem('dressme_autosave');
    if (autosaved) {
      try {
        const { layers: savedLayers, background: savedBg } = JSON.parse(autosaved);
        if (savedLayers && savedLayers.length > 0) {
          setLayers(savedLayers);
          setBackground(savedBg || background);
          toast.info('Recovered unsaved work');
        }
      } catch (e) {
        console.error('Failed to load autosave:', e);
      }
    }
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    if (layers.length > 0) {
      localStorage.setItem('dressme_autosave', JSON.stringify({ layers, background }));
    }
  }, [layers, background]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return allItems;
    return allItems.filter(item => item.category === selectedCategory);
  }, [allItems, selectedCategory]);

  // Handle adding item to canvas
  const handleAddItemToCanvas = useCallback((item: WardrobeItem) => {
    const newLayer: CanvasLayer = {
      id: `layer-${Date.now()}-${Math.random()}`,
      wardrobeItem: item,
      transform: {
        x: 0,
        y: 0,
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
    toast.success('Item added to canvas');
  }, [layers, analytics]);

  // Handle save
  const handleSave = async () => {
    if (layers.length === 0) {
      toast.error('Please add items to your fit first');
      return;
    }

    try {
      const canvasData = {
        layers: layers.map(layer => ({
          wardrobeItemId: layer.wardrobeItem.id,
          transform: layer.transform,
          opacity: layer.opacity,
          flipH: layer.flipH,
          visible: layer.visible,
          zIndex: layer.zIndex,
        })),
        background,
      };

      const fitItems = layers.map((layer, index) => ({
        wardrobe_item_id: layer.wardrobeItem.id,
        z_index: layer.zIndex,
        transform: layer.transform,
      }));

      // Render canvas to base64 for server-side storage
      const canvasImageBase64 = await renderCanvasToBase64(
        layers.map(l => ({
          id: l.id,
          imageUrl: l.wardrobeItem.image_bg_removed_url || l.wardrobeItem.image_url,
          position: { x: l.transform.x || 0, y: l.transform.y || 0 },
          scale: l.transform.scale || 1,
          rotation: l.transform.rotation || 0,
          flippedH: l.flipH,
          opacity: l.opacity,
          visible: l.visible,
          zIndex: l.zIndex,
        })),
        background,
        800,
        800
      );

      const result = await saveFit.mutateAsync({
        title: fitTitle || undefined,
        canvas_json: canvasData,
        canvas_image_base64: canvasImageBase64,
        is_public: isPublic,
        items: fitItems,
      });

      if (result) {
        analytics.saveFit(result.id, isPublic);
        toast.success('Saved to My Fits. Share with friends?');
        setIsSaveModalOpen(false);
        setFitTitle('');
        setIsPublic(false);
        // Clear autosave
        localStorage.removeItem('dressme_autosave');
      }
    } catch (error) {
      console.error('Error saving fit:', error);
      toast.error('Failed to save fit');
    }
  };

  // Handle use public fit
  const handleUsePublicFit = useCallback(async (fitId: string) => {
    try {
      // Fetch the fit data
      const { data: fitData, error } = await supabase
        .from('fits')
        .select('*, creator:users!fits_user_id_fkey(username, name, avatar_url)')
        .eq('id', fitId)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      if (!fitData) {
        toast.error('Fit not found');
        return;
      }

      const canvasJson = fitData.canvas_json as any;

      // Fetch all wardrobe items referenced in the fit
      const itemIds = canvasJson.layers.map((l: any) => l.wardrobeItemId);
      const { data: items } = await supabase
        .from('wardrobe_items')
        .select('*')
        .in('id', itemIds);

      if (!items || items.length === 0) {
        toast.error('Could not load fit items');
        return;
      }

      // Recreate layers
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
      
      analytics.usePublicFit(fitId, fitData.user_id);
      toast.success('Fit loaded! Customize it and save as your own');
    } catch (error) {
      console.error('Error loading public fit:', error);
      toast.error('Failed to load fit');
    }
  }, [analytics]);

  // Handle item added from upload
  const handleItemAdded = useCallback((itemId: string) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) {
      handleAddItemToCanvas(item);
    }
  }, [allItems, handleAddItemToCanvas]);

  // Onboarding check
  if (!isLoading && allItems.length === 0) {
    return (
      <>
        <SEOHead
          title="Dress Me - Create Outfits | Azyah"
          description="Create stunning outfit combinations with your wardrobe items"
        />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Welcome to Dress Me!</h1>
              <p className="text-muted-foreground">
                Start by uploading your first closet item to create amazing outfits
              </p>
            </div>
            <Button onClick={() => setIsUploadModalOpen(true)} size="lg" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Item
            </Button>
          </Card>
        </div>
        <WardrobeUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onItemAdded={handleItemAdded}
        />
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Dress Me - Create Outfits | Azyah"
        description="Create stunning outfit combinations with your wardrobe items using our interactive canvas"
      />
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container max-w-6xl mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BackButton fallbackPath="/" variant="ghost" size="sm" showIcon={false}>
                  <Home className="h-5 w-5" />
                </BackButton>
                <h1 className="text-2xl font-bold">Dress Me</h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBackgroundPickerOpen(true)}
                >
                  <Palette className="w-4 h-4" />
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
        </div>

        {/* Main Content */}
        <div className="container max-w-6xl mx-auto p-4 space-y-6">
          {/* Canvas */}
          <EnhancedInteractiveCanvas
            layers={layers}
            onLayersChange={setLayers}
            background={background}
          />

          {/* Source Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="closet" className="flex-1">My Closet</TabsTrigger>
              <TabsTrigger value="community" className="flex-1">Community</TabsTrigger>
            </TabsList>

            <TabsContent value="closet" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <CategoryChips
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <WardrobeThumbnailRail
                items={filteredItems}
                onSelectItem={handleAddItemToCanvas}
              />
            </TabsContent>

            <TabsContent value="community" className="mt-4">
              <PublicFitsGrid
                onFitClick={(fit) => {
                  setSelectedPublicFit(fit);
                  setIsFitDetailsOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        <WardrobeUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onItemAdded={handleItemAdded}
        />

        <BackgroundPicker
          isOpen={isBackgroundPickerOpen}
          onClose={() => setIsBackgroundPickerOpen(false)}
          onSelect={setBackground}
          currentBackground={background}
        />

        <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save your fit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={fitTitle}
                  onChange={(e) => setFitTitle(e.target.value)}
                  placeholder="My awesome fit"
                />
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
              <Button onClick={handleSave} className="w-full" disabled={saveFit.isPending}>
                {saveFit.isPending ? 'Saving...' : 'Save Fit'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <FitDetailsModal
          fit={selectedPublicFit}
          open={isFitDetailsOpen}
          onClose={() => setIsFitDetailsOpen(false)}
          onUseThisFit={handleUsePublicFit}
        />
      </div>
    </>
  );
}
