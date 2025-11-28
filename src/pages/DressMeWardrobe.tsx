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
import { useWardrobeLayers, useAddWardrobeLayer, useUpdateWardrobeLayer, useDeleteWardrobeLayer, useUpdateLayerSelection, useUpdateLayerCategory, WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { AccessoriesTray } from '@/components/AccessoriesTray';
import { SEOHead } from '@/components/SEOHead';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { useFits, usePublicFits, useDeleteFit } from '@/hooks/useFits';
import { OutfitPreviewCard } from '@/components/OutfitPreviewCard';
import { useDressMeAnalytics } from '@/hooks/useDressMeAnalytics';
import { CommunityOutfits } from './CommunityOutfits';
import { CommunityClothes } from './CommunityClothes';
import { FriendsTab } from '@/components/FriendsTab';
import { OutfitDetailSheet } from '@/components/OutfitDetailSheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { LayerScrollProvider } from '@/contexts/LayerScrollContext';

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
  const updateLayerCategory = useUpdateLayerCategory();
  const analytics = useDressMeAnalytics();

  // Get initial state from URL params
  const [activeTab, setActiveTab] = useState<'clothes' | 'outfits' | 'community' | 'friends'>(
    (searchParams.get('tab') as 'clothes' | 'outfits' | 'community' | 'friends') || 'clothes'
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

  // Debug: Log layer state on mount and updates
  useEffect(() => {
    console.log('📊 DressMeWardrobe State Update:');
    console.log('  Layers:', layers);
    console.log('  All Items:', allItems.length);
    console.log('  Layers Loading:', layersLoading);
    console.log('  Items Loading:', isLoading);
  }, [layers, allItems, layersLoading, isLoading]);

  // No auto-layer creation - users control layers manually

  // Get items for each layer
  const getLayerItems = (category: string) => {
    return allItems.filter(item => item.category === category);
  };

  // Create a map of items by category for quick access
  const itemsByCategory = useMemo(() => {
    const map: Record<string, WardrobeItem[]> = {};
    allItems.forEach(item => {
      if (!map[item.category]) {
        map[item.category] = [];
      }
      map[item.category].push(item);
    });
    return map;
  }, [allItems]);

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
    
    // Only apply mode filtering if layers actually exist
    if (layers.length > 0) {
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
    }
    // If no layers, show all categories
    
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


  const handleAddLayer = (category: string) => {
    console.log('🔵 handleAddLayer called:', category);
    
    const isDress = category === 'dress';
    const isTopOrBottom = ['top', 'bottom'].includes(category);
    
    if (isDress && (layers.some(l => l.category === 'top') || layers.some(l => l.category === 'bottom'))) {
      console.log('⚠️ Dress mode switch required');
      toast.info('Switching to Dress mode. Tops and Bottoms will be hidden.', {
        action: {
          label: 'OK',
          onClick: () => {
            console.log('✅ User confirmed dress mode');
            addLayerMutation.mutate(category as any);
          },
        },
      });
      return;
    }
    
    if (isTopOrBottom && layers.some(l => l.category === 'dress')) {
      console.log('⚠️ Top/Bottom mode switch required');
      toast.info('Switching to Tops & Bottoms mode. Dress will be hidden.', {
        action: {
          label: 'OK',
          onClick: () => {
            console.log('✅ User confirmed top/bottom mode');
            addLayerMutation.mutate(category as any);
          },
        },
      });
      return;
    }
    
    console.log('✅ Adding layer directly:', category);
    addLayerMutation.mutate(category as any);
  };

  const handleAddItemToLayer = (category?: string) => {
    setUploadCategory(category);
    setIsUploadModalOpen(true);
  };

  const handleLayerItemClick = (layerId: string, itemId: string) => {
    console.log(`👆 User clicked item ${itemId} in layer ${layerId}`);
    updateLayerSelection.mutate({ layerId, itemId });
  };

  // Fisher-Yates shuffle for true randomization
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleShuffleAll = async () => {
    console.log('🎲 ========== SHUFFLE START ==========');
    
    if (layers.length === 0) {
      toast.info('Add some layers first');
      return;
    }

    const unpinnedLayers = layers.filter(l => !l.is_pinned);
    
    if (unpinnedLayers.length === 0) {
      toast.info('All layers are pinned');
      return;
    }

    // Build ALL updates first, then batch them
    const updates: Array<{ layerId: string; itemId: string; category: string }> = [];

    for (const layer of unpinnedLayers) {
      const layerItems = getLayerItems(layer.category);
      
      if (layerItems.length === 0) {
        console.log(`⏭️ Skipped ${layer.category} (no items)`);
        continue;
      }

      const currentItemId = layer.selected_item_id;
      let selectedItem: WardrobeItem;
      
      if (layerItems.length === 1) {
        selectedItem = layerItems[0];
      } else {
        // Use Fisher-Yates shuffle for TRUE randomization
        const availableItems = currentItemId 
          ? layerItems.filter(item => item.id !== currentItemId)
          : layerItems;
        
        // Shuffle entire array, then pick first item - guarantees no correlation
        const shuffled = shuffleArray(availableItems);
        selectedItem = shuffled[0];
      }
      
      console.log(`🔄 ${layer.category}: Shuffled and picked ${selectedItem.id}`);
      updates.push({ 
        layerId: layer.id, 
        itemId: selectedItem.id,
        category: layer.category 
      });
    }

    // Execute ALL updates simultaneously
    try {
      await Promise.all(
        updates.map(({ layerId, itemId, category }) => 
          updateLayerSelection.mutateAsync({ layerId, itemId })
            .then(() => console.log(`✅ ${category} updated`))
            .catch(err => {
              console.error(`❌ ${category} failed:`, err);
              throw new Error(category);
            })
        )
      );
      
      // Give React time to finish all render cycles
      await new Promise(resolve => setTimeout(resolve, 50));
      
      toast.success(`Shuffled ${updates.length} layer${updates.length !== 1 ? 's' : ''}`);
    } catch (error: any) {
      toast.error(`Failed to shuffle: ${error.message}`);
    }
    
    console.log('🎲 ========== SHUFFLE END ==========');
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

  const handleLayerItemSelect = (layerId: string, itemId: string) => {
    updateLayerSelection.mutate({
      layerId,
      itemId,
    });
  };

  const handleLayerPinToggle = (layerId: string, isPinned: boolean) => {
    updateLayerMutation.mutate({
      id: layerId,
      is_pinned: !isPinned,
    });
  };

  const handleRemoveLayer = (layerId: string) => {
    deleteLayerMutation.mutate(layerId);
  };

  const handleLayerCategoryChange = (layerId: string, newCategory: WardrobeLayer['category']) => {
    updateLayerCategory.mutate({ id: layerId, category: newCategory });
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
        <div className="container max-w-6xl mx-auto py-2 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BackButton fallbackPath="/" variant="ghost" size="sm" />
              <div>
                <h1 className="text-lg font-semibold">Digital Closet</h1>
                <p className="text-xs text-muted-foreground">upload all clothes you own here</p>
              </div>
            </div>
          </div>

          {/* Segmented Control */}
          <div className="segmented-control text-sm">
            <button 
              className={activeTab === 'clothes' ? 'segment active' : 'segment'}
              onClick={() => setActiveTab('clothes')}
            >
              Your Clothes
            </button>
            <button 
              className={activeTab === 'outfits' ? 'segment active' : 'segment'}
              onClick={() => setActiveTab('outfits')}
            >
              Outfits
            </button>
            <button 
              className={activeTab === 'friends' ? 'segment active' : 'segment'}
              onClick={() => setActiveTab('friends')}
            >
              Friends
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
        <div className="container max-w-6xl mx-auto p-3">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="clothes" className="mt-3 space-y-3">
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

              {/* Divider between All Items and Layers */}
              {layers.length > 0 && (
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/40"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground/60 font-medium">Randomizer</span>
                  </div>
                </div>
              )}

              {/* Mode hint for Dress */}
              {layerMode === 'dressShoes' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                  <p>👗 <strong>Dress mode:</strong> Dress replaces top & bottoms</p>
                </div>
              )}

              {/* Vertical Layer Carousels - Wrapped in ScrollProvider for sync */}
              {layers.length > 0 && (
                <LayerScrollProvider>
                  <div className="space-y-6 pb-6">
                    {layers.map((layer) => (
                      <WardrobeLayerCarousel
                        key={layer.id}
                        layer={layer}
                        items={itemsByCategory[layer.category] || []}
                        selectedItemId={layer.selected_item_id}
                        onItemClick={(itemId) => handleLayerItemSelect(layer.id, itemId)}
                        onPinToggle={() => handleLayerPinToggle(layer.id, layer.is_pinned)}
                        onRemoveLayer={() => handleRemoveLayer(layer.id)}
                        onCategoryChange={(newCategory) => handleLayerCategoryChange(layer.id, newCategory)}
                        onAddItem={() => {
                          setSelectedCategory(layer.category);
                          setIsUploadModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </LayerScrollProvider>
              )}


            </TabsContent>

            <TabsContent value="outfits" className="mt-3 space-y-3">
              {/* Occasion filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', 'Work', 'Casual', 'Home', 'School', 'Date'].map((occasion) => (
                  <Button
                    key={occasion}
                    variant={selectedOccasion === occasion ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0 rounded-full text-xs px-3 h-8"
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

            <TabsContent value="community" className="mt-3 space-y-3">
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

            <TabsContent value="friends" className="mt-3">
              <FriendsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bottom Action Bar */}
      {!selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3 z-40 bottom-action-bar" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
          <div className="container max-w-6xl mx-auto flex gap-2">
            <Button
              onClick={handleShuffleAll}
              variant="outline"
              size="default"
              className="w-28 h-9"
              disabled={layers.filter(l => !l.is_pinned).length === 0}
            >
              <Shuffle className="w-4 h-4 mr-1.5" />
              <span className="text-sm">Shuffle</span>
            </Button>
            <Button
              onClick={handleDone}
              size="default"
              className="flex-1 h-9 text-sm"
            >
              {selectedItems.length > 0 
                ? `Create Outfit (${selectedItems.length})`
                : 'Go to Canvas'
              }
            </Button>
          </div>
        </div>
      )}

      {/* Delete Selected Button - shown in selection mode */}
      {selectionMode && selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3 z-40 bottom-action-bar">
          <div className="container max-w-6xl mx-auto">
            <Button
              onClick={handleDeleteSelected}
              size="default"
              variant="destructive"
              className="w-full h-9 text-sm"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
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
