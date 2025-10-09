import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Share2, Upload, Palette, Layers } from 'lucide-react';
import { InteractiveCanvas, CanvasLayer } from '@/components/InteractiveCanvas';
import { CategoryChips } from '@/components/CategoryChips';
import { WardrobeThumbnailRail } from '@/components/WardrobeThumbnailRail';
import { BackgroundPicker } from '@/components/BackgroundPicker';
import { WardrobeUploadModal } from '@/components/WardrobeUploadModal';
import { useWardrobeItems, WardrobeItem } from '@/hooks/useWardrobeItems';
import { useSaveFit } from '@/hooks/useFits';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function DressMe() {
  const { data: allItems = [], isLoading } = useWardrobeItems();
  const saveFit = useSaveFit();

  // State
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'closet' | 'community'>('closet');
  const [background, setBackground] = useState<{ type: 'solid' | 'gradient' | 'pattern' | 'image'; value: string }>({ type: 'solid', value: '#F5F5F5' });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [fitTitle, setFitTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);

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
      visible: true,
      zIndex: layers.length,
    };
    setLayers([...layers, newLayer]);
    toast.success('Item added to canvas');
  }, [layers]);

  // Handle save
  const handleSave = async () => {
    if (layers.length === 0) {
      toast.error('Please add items to your fit first');
      return;
    }

    const canvasData = {
      layers: layers.map(layer => ({
        wardrobeItemId: layer.wardrobeItem.id,
        transform: layer.transform,
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

    saveFit.mutate({
      title: fitTitle || undefined,
      canvas_json: canvasData,
      is_public: isPublic,
      items: fitItems,
    });

    setIsSaveModalOpen(false);
    setFitTitle('');
    setIsPublic(false);
  };

  // Onboarding if no items
  if (!isLoading && allItems.length === 0) {
    return (
      <>
        <SEOHead
          title="Dress Me - Create Outfits"
          description="Create amazing outfits by mixing and matching items from your wardrobe"
        />
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <Card className="max-w-md p-8 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Welcome to Dress Me! 🧥</h1>
              <p className="text-muted-foreground">
                Upload items to start creating outfits with our interactive canvas
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
                <h3 className="font-medium">How it works:</h3>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Upload photos of clothing items</li>
                  <li>2. AI removes backgrounds automatically</li>
                  <li>3. Drag, resize, and rotate items on canvas</li>
                  <li>4. Save and share your favorite fits</li>
                </ol>
              </div>

              <Button onClick={() => setIsUploadModalOpen(true)} size="lg" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Item
              </Button>
            </div>
          </Card>
          
          <WardrobeUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Dress Me - Create Outfits"
        description="Create amazing outfits by mixing and matching items from your wardrobe"
      />
      
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dress Me 🧥</h1>
              <p className="text-muted-foreground">Create outfits with your wardrobe</p>
            </div>
            <Button onClick={() => setIsUploadModalOpen(true)} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Add Items
            </Button>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Canvas */}
            <div className="space-y-4">
              <InteractiveCanvas
                layers={layers}
                onLayersChange={setLayers}
                background={background}
              />
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => setIsBackgroundPickerOpen(true)} variant="outline" className="flex-1">
                  <Palette className="w-4 h-4 mr-2" />
                  Background
                </Button>
                <Button onClick={() => setIsSaveModalOpen(true)} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Fit
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right: Item Selection */}
            <div className="space-y-4">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'closet' | 'community')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="closet">My Closet</TabsTrigger>
                  <TabsTrigger value="community">Community</TabsTrigger>
                </TabsList>

                <TabsContent value="closet" className="space-y-4">
                  {/* Category Chips */}
                  <CategoryChips
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                  />

                  {/* Thumbnail Rail */}
                  <WardrobeThumbnailRail
                    items={filteredItems}
                    onSelectItem={handleAddItemToCanvas}
                  />

                  {/* Stats */}
                  <div className="text-sm text-muted-foreground">
                    {filteredItems.length} items
                    {selectedCategory !== 'all' && ` in ${selectedCategory}`}
                  </div>
                </TabsContent>

                <TabsContent value="community" className="space-y-4">
                  <div className="h-96 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Community fits coming soon
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Modals */}
        <WardrobeUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />

        <BackgroundPicker
          isOpen={isBackgroundPickerOpen}
          onClose={() => setIsBackgroundPickerOpen(false)}
          onSelect={setBackground}
          currentBackground={background}
        />

        {/* Save Modal */}
        <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Your Fit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title (Optional)</Label>
                <Input
                  placeholder="Summer vibes..."
                  value={fitTitle}
                  onChange={(e) => setFitTitle(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Make Public</Label>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsSaveModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  Save Fit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
