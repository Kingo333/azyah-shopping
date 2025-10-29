import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, MoreVertical, Trash2, CheckSquare, X, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WardrobeAllItemsGrid } from '@/components/WardrobeAllItemsGrid';
import { WardrobeLayerCarousel } from '@/components/WardrobeLayerCarousel';
import { AddLayerButton } from '@/components/AddLayerButton';
import { WardrobeCategoryTabs } from '@/components/WardrobeCategoryTabs';
import { WardrobeUploadModal } from '@/components/WardrobeUploadModal';
import { WardrobeItemDetailModal } from '@/components/WardrobeItemDetailModal';
import { useWardrobeItems, WardrobeItem, useDeleteWardrobeItem } from '@/hooks/useWardrobeItems';
import { useWardrobeLayers, useAddWardrobeLayer, useUpdateWardrobeLayer, useDeleteWardrobeLayer, useUpdateLayerSelection } from '@/hooks/useWardrobeLayers';
import { AccessoriesTray } from '@/components/AccessoriesTray';
import { SEOHead } from '@/components/SEOHead';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { useFits, usePublicFits, useDeleteFit } from '@/hooks/useFits';
import { OutfitPreviewCard } from '@/components/OutfitPreviewCard';
import { useDressMeAnalytics } from '@/hooks/useDressMeAnalytics';
import { CommunityOutfits } from './CommunityOutfits';
import { CommunityClothes } from './CommunityClothes';
import { OutfitDetailSheet } from '@/components/OutfitDetailSheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function DressMeWardrobe() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allItems = [], isLoading } = useWardrobeItems();
  const { data: userFits = [] } = useFits();
  const { data: layers = [], isLoading: layersLoading } = useWardrobeLayers();
  const addLayerMutation = useAddWardrobeLayer();
  const updateLayerMutation = useUpdateWardrobeLayer();
  const deleteLayerMutation = useDeleteWardrobeLayer();
  const updateLayerSelection = useUpdateLayerSelection();
  const analytics = useDressMeAnalytics();

  // Get initial state from URL params
  const [activeTab, setActiveTab] = useState<'clothes' | 'outfits' | 'community'>(
    (searchParams.get('tab') as 'clothes' | 'outfits' | 'community') || 'clothes'
  );
  const [communitySubTab, setCommunitySubTab] = useState<'outfits' | 'clothes'>('outfits');
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string | undefined>();
  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [fitToDelete, setFitToDelete] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<WardrobeItem | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  
  // Layer modes
  type LayerMode = 'topBottomsShoes' | 'dressShoes';
  const [layerMode, setLayerMode] = useState<LayerMode>('topBottomsShoes');
  
  const deleteFit = useDeleteFit();
  const deleteItemMutation = useDeleteWardrobeItem();

  // Update URL params when tab or category changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'clothes') params.set('tab', activeTab);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    setSearchParams(params, { replace: true });
  }, [activeTab, selectedCategory, setSearchParams]);

  React.useEffect(() => {
    analytics.open();
  }, []);

  // Determine layer mode from active layers
  useEffect(() => {
    const hasDress = layers.some(l => l.category === 'dress');
    const hasTopOrBottom = layers.some(l => ['top', 'bottom'].includes(l.category));
    
    if (hasDress && !hasTopOrBottom) {
      setLayerMode('dressShoes');
    } else {
      setLayerMode('topBottomsShoes');
    }
  }, [layers]);

  // No auto-layer creation - users control layers manually

  // Get items for each layer
  const getLayerItems = (category: string) => {
    return allItems.filter(item => item.category === category);
  };

  // Available categories for adding new layers
  const allCategories = [
    { value: 'top', label: 'Tops' },
    { value: 'bottom', label: 'Bottoms' },
    { value: 'dress', label: 'Dresses' },
    { value: 'outerwear', label: 'Outerwear' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'bag', label: 'Bags' },
    { value: 'accessory', label: 'Accessories' },
  ];

  const availableCategories = useMemo(() => {
    const existingCategories = new Set(layers.map(l => l.category));
    
    let filteredCategories = allCategories;
    
    if (layerMode === 'dressShoes') {
      // Dress mode: hide Top and Bottom options
      filteredCategories = allCategories.filter(
        cat => !['top', 'bottom'].includes(cat.value)
      );
    } else if (layerMode === 'topBottomsShoes') {
      // Top+Bottoms mode: hide Dress option
      filteredCategories = allCategories.filter(
        cat => cat.value !== 'dress'
      );
    }
    
    return filteredCategories.filter(
      cat => !existingCategories.has(cat.value as any)
    );
  }, [layers, layerMode]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(allItems.map(item => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleDone = () => {
    if (selectedItems.length === 0) {
      navigate('/dress-me/canvas');
      return;
    }
    
    // Store selected items in sessionStorage
    sessionStorage.setItem('dressme_selected_items', JSON.stringify(selectedItems));
    navigate('/dress-me/canvas');
  };

  const handleItemAdded = (itemId: string) => {
    // Automatically select newly added item
    setSelectedItems(prev => [...prev, itemId]);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    
    if (category === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Scroll to layer if it exists
    const layerElement = document.getElementById(`layer-${category}`);
    if (layerElement) {
      layerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handlePinToggle = (layerId: string, currentPinState: boolean) => {
    updateLayerMutation.mutate({ id: layerId, is_pinned: !currentPinState });
  };

  const handleRemoveLayer = (layerId: string) => {
    deleteLayerMutation.mutate(layerId);
  };

  const handleAddLayer = (category: string) => {
    const isDress = category === 'dress';
    const isTopOrBottom = ['top', 'bottom'].includes(category);
    
    if (isDress && (layers.some(l => l.category === 'top') || layers.some(l => l.category === 'bottom'))) {
      toast.info('Switching to Dress mode. Tops and Bottoms will be hidden.', {
        action: {
          label: 'OK',
          onClick: () => addLayerMutation.mutate(category as any),
        },
      });
      return;
    }
    
    if (isTopOrBottom && layers.some(l => l.category === 'dress')) {
      toast.info('Switching to Tops & Bottoms mode. Dress will be hidden.', {
        action: {
          label: 'OK',
          onClick: () => addLayerMutation.mutate(category as any),
        },
      });
      return;
    }
    
    addLayerMutation.mutate(category as any);
  };

  const handleAddItemToLayer = (category?: string) => {
    setUploadCategory(category);
    setIsUploadModalOpen(true);
  };

  const handleLayerItemSelect = (layerId: string, itemId: string) => {
    updateLayerSelection.mutate({ layerId, itemId });
  };

  // Seeded RNG for shuffle to avoid immediate repeats
  let shuffleSeed = Date.now();
  const seededRandom = () => {
    shuffleSeed = (shuffleSeed * 9301 + 49297) % 233280;
    return shuffleSeed / 233280;
  };

  const handleShuffleAll = async () => {
    if (layers.length === 0) {
      toast.info('Add some layers first');
      return;
    }

    console.log('🎲 Starting shuffle...');
    let shuffled = 0;
    const errors: string[] = [];

    // Process layers sequentially to avoid race conditions
    for (const layer of layers) {
      const layerItems = getLayerItems(layer.category);
      console.log(`Layer ${layer.category}: ${layerItems.length} items`);
      
      if (layerItems.length <= 1) {
        console.log(`Skipping ${layer.category} (not enough items)`);
        continue;
      }

      // Get available items (exclude current selection to ensure change)
      const availableItems = layerItems.filter(
        item => item.id !== layer.selected_item_id
      );
      
      console.log(`Available items for ${layer.category}:`, availableItems.length);

      if (availableItems.length > 0) {
        try {
          const randomIndex = Math.floor(seededRandom() * availableItems.length);
          const randomItem = availableItems[randomIndex];
          
          console.log(`Shuffling ${layer.category}: ${layer.selected_item_id} → ${randomItem.id}`);
          
          // Wait for each mutation to complete before moving to next layer
          await updateLayerSelection.mutateAsync({ 
            layerId: layer.id, 
            itemId: randomItem.id 
          });
          
          shuffled++;
          console.log(`✅ ${layer.category} shuffled successfully`);
          
          // Small delay to let carousel respond
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Failed to shuffle ${layer.category}:`, error);
          errors.push(layer.category);
        }
      }
    }

    // Show final result
    if (errors.length > 0) {
      toast.error(`Failed to shuffle: ${errors.join(', ')}`);
    } else if (shuffled > 0) {
      toast.success(`Shuffled ${shuffled} ${shuffled === 1 ? 'layer' : 'layers'}`);
    } else {
      toast.info('No layers to shuffle');
    }
    
    console.log(`🎲 Shuffle complete: ${shuffled} shuffled, ${errors.length} errors`);
  };

  const handleDeleteFit = async () => {
    if (!fitToDelete) return;
    await deleteFit.mutateAsync(fitToDelete);
    setFitToDelete(null);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      await Promise.all(selectedItems.map(itemId => deleteItemMutation.mutateAsync(itemId)));
      toast.success(`Deleted ${selectedItems.length} item(s)`);
      setSelectedItems([]);
      setSelectionMode(false);
    } catch (error) {
      toast.error('Failed to delete items');
    }
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedItems([]);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedItems([]);
  };

  const handleItemClick = (item: WardrobeItem) => {
    if (!selectionMode) {
      setSelectedItemDetail(item);
    }
  };

  // Onboarding state
  if (!isLoading && allItems.length === 0) {
    return (
      <>
        <SEOHead
          title="My Wardrobe - Dress Me | Azyah"
          description="Build your digital wardrobe and create amazing outfits"
        />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Build Your Wardrobe</h1>
              <p className="text-muted-foreground">
                Start by uploading photos of your clothes. We'll remove the background automatically!
              </p>
            </div>
            <Button onClick={() => setIsUploadModalOpen(true)} size="lg" className="w-full">
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Item
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
        title="My Wardrobe - Dress Me | Azyah"
        description="Build your digital wardrobe and create amazing outfits"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container max-w-6xl mx-auto py-3 px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BackButton fallbackPath="/" variant="ghost" size="sm" />
              <h1 className="text-2xl font-bold">My Wardrobe</h1>
            </div>
          </div>

          {/* Segmented Control */}
          <div className="segmented-control">
            <button 
              className={activeTab === 'clothes' ? 'segment active' : 'segment'}
              onClick={() => setActiveTab('clothes')}
            >
              Clothes
            </button>
            <button 
              className={activeTab === 'outfits' ? 'segment active' : 'segment'}
              onClick={() => setActiveTab('outfits')}
            >
              Outfits
            </button>
            <button 
              className={activeTab === 'community' ? 'segment active' : 'segment'}
              onClick={() => setActiveTab('community')}
            >
              Community
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-container bg-background">
        <div className="container max-w-6xl mx-auto p-4">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="clothes" className="mt-4 space-y-5">
              {/* Category Filter */}
              <WardrobeCategoryTabs
                selected={selectedCategory}
                onSelect={handleCategoryClick}
              />

              {/* Selection controls */}
              {selectionMode && selectedItems.length > 0 && (
                <div className="selection-action-bar">
                  <div className="action-item">
                    <Button variant="ghost" size="icon" className="w-14 h-14" onClick={handleSelectAll}>
                      <CheckSquare className="w-5 h-5" />
                    </Button>
                    <span className="text-xs">Select All</span>
                  </div>
                  <div className="action-item">
                    <Button variant="ghost" size="icon" className="w-14 h-14" onClick={handleDeselectAll}>
                      <X className="w-5 h-5" />
                    </Button>
                    <span className="text-xs">Clear</span>
                  </div>
                </div>
              )}

              {/* All Items Grid */}
              <WardrobeAllItemsGrid
                items={allItems}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                onAddNew={() => handleAddItemToLayer()}
                onItemClick={handleItemClick}
                selectionMode={selectionMode}
                onToggleSelectionMode={selectionMode ? handleExitSelectionMode : handleEnterSelectionMode}
                onAddLayer={(category) => handleAddLayer(category)}
                availableCategories={availableCategories}
              />

              {/* Mode hint for Dress */}
              {layerMode === 'dressShoes' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p>👗 <strong>Dress mode:</strong> Dress replaces top & bottoms</p>
                </div>
              )}

              {/* Layered Carousels */}
              <div className="space-y-0">
                {layers.map((layer) => (
                  <div key={layer.id} id={`layer-${layer.category}`}>
                    <WardrobeLayerCarousel
                      layer={layer}
                      items={getLayerItems(layer.category)}
                      selectedItemId={layer.selected_item_id}
                      onItemSelect={(itemId) => handleLayerItemSelect(layer.id, itemId)}
                      onPinToggle={() => handlePinToggle(layer.id, layer.is_pinned)}
                      onRemoveLayer={() => handleRemoveLayer(layer.id)}
                      onAddItem={() => handleAddItemToLayer(layer.category)}
                    />
                  </div>
                ))}
              </div>


            </TabsContent>

            <TabsContent value="outfits" className="mt-4 space-y-4">
              {/* Occasion filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', 'Work', 'Casual', 'Home', 'School', 'Date'].map((occasion) => (
                  <Button
                    key={occasion}
                    variant={selectedOccasion === occasion ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0 rounded-full"
                    onClick={() => setSelectedOccasion(occasion)}
                  >
                    {occasion}
                  </Button>
                ))}
              </div>

              {/* Outfits Grid */}
              {(() => {
                const filteredFits = selectedOccasion === 'All' 
                  ? userFits 
                  : userFits.filter(fit => fit.occasion === selectedOccasion);

                return filteredFits.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      {selectedOccasion === 'All' 
                        ? "You haven't saved any outfits yet"
                        : `No ${selectedOccasion} outfits saved yet`
                      }
                    </p>
                    <Button onClick={handleDone}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Outfit
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredFits.map((fit) => (
                      <OutfitPreviewCard
                        key={fit.id}
                        fit={fit}
                        onClick={() => {
                          setSelectedOutfitId(fit.id);
                        }}
                        onDelete={(fitId) => setFitToDelete(fitId)}
                      />
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="community" className="mt-4 space-y-4">
              <Tabs value={communitySubTab} onValueChange={(v) => setCommunitySubTab(v as any)} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="outfits">Outfits</TabsTrigger>
                  <TabsTrigger value="clothes">Clothes</TabsTrigger>
                </TabsList>

                <TabsContent value="outfits" className="mt-6">
                  <CommunityOutfits />
                </TabsContent>

                <TabsContent value="clothes" className="mt-6">
                  <CommunityClothes />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bottom Action Bar */}
      {!selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-40 bottom-action-bar" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          <div className="container max-w-6xl mx-auto flex gap-2">
            <Button
              onClick={handleShuffleAll}
              variant="outline"
              size="lg"
              className="w-32"
              disabled={layers.filter(l => !l.is_pinned).length === 0}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
            <Button
              onClick={handleDone}
              size="lg"
              className="flex-1"
            >
              {selectedItems.length > 0 
                ? `Create Outfit with ${selectedItems.length} items`
                : 'Go to Canvas'
              }
            </Button>
          </div>
        </div>
      )}

      {/* Delete Selected Button - shown in selection mode */}
      {selectionMode && selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-40 bottom-action-bar">
          <div className="container max-w-6xl mx-auto">
            <Button
              onClick={handleDeleteSelected}
              size="lg"
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedItems.length} Item(s)
            </Button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <WardrobeUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadCategory(undefined);
        }}
        onItemAdded={handleItemAdded}
        presetCategory={uploadCategory}
      />

      {/* Item Detail Modal */}
      <WardrobeItemDetailModal
        item={selectedItemDetail}
        isOpen={!!selectedItemDetail}
        onClose={() => setSelectedItemDetail(null)}
      />

      {/* Outfit Detail Sheet */}
      <OutfitDetailSheet
        fitId={selectedOutfitId}
        isOpen={!!selectedOutfitId}
        onClose={() => setSelectedOutfitId(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fitToDelete} onOpenChange={(open) => !open && setFitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Outfit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your outfit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteFit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
