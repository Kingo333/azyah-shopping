import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WardrobeAllItemsGrid } from '@/components/WardrobeAllItemsGrid';
import { WardrobeLayerCarousel } from '@/components/WardrobeLayerCarousel';
import { AddLayerButton } from '@/components/AddLayerButton';
import { WardrobeCategoryTabs } from '@/components/WardrobeCategoryTabs';
import { WardrobeUploadModal } from '@/components/WardrobeUploadModal';
import { useWardrobeItems, WardrobeItem } from '@/hooks/useWardrobeItems';
import { useWardrobeLayers, useAddWardrobeLayer, useUpdateWardrobeLayer, useDeleteWardrobeLayer } from '@/hooks/useWardrobeLayers';
import { SEOHead } from '@/components/SEOHead';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { useFits, usePublicFits, useDeleteFit } from '@/hooks/useFits';
import { OutfitPreviewCard } from '@/components/OutfitPreviewCard';
import { useDressMeAnalytics } from '@/hooks/useDressMeAnalytics';
import { CommunityOutfits } from './CommunityOutfits';
import { CommunityClothes } from './CommunityClothes';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function DressMeWardrobe() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allItems = [], isLoading } = useWardrobeItems();
  const { data: userFits = [] } = useFits();
  const { data: layers = [], isLoading: layersLoading } = useWardrobeLayers();
  const addLayerMutation = useAddWardrobeLayer();
  const updateLayerMutation = useUpdateWardrobeLayer();
  const deleteLayerMutation = useDeleteWardrobeLayer();
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
  
  const deleteFit = useDeleteFit();

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
    return allCategories.filter(cat => !existingCategories.has(cat.value as any));
  }, [layers]);

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
    addLayerMutation.mutate(category as any);
  };

  const handleAddItemToLayer = (category?: string) => {
    setUploadCategory(category);
    setIsUploadModalOpen(true);
  };

  const handleDeleteFit = async () => {
    if (!fitToDelete) return;
    await deleteFit.mutateAsync(fitToDelete);
    setFitToDelete(null);
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
        <div className="container max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BackButton fallbackPath="/" variant="ghost" size="sm" />
              <h1 className="text-2xl font-bold">My Wardrobe</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {/* TODO: Settings */}}
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="clothes" className="text-sm md:text-base">
                Clothes
              </TabsTrigger>
              <TabsTrigger value="outfits" className="text-sm md:text-base">
                Outfits
              </TabsTrigger>
              <TabsTrigger value="community" className="text-sm md:text-base">
                Community
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen bg-background pb-24">
        <div className="container max-w-6xl mx-auto p-4">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="clothes" className="mt-4 space-y-4">
              {/* Category Filter */}
              <div className="flex items-center justify-between gap-4">
                <WardrobeCategoryTabs
                  selected={selectedCategory}
                  onSelect={handleCategoryClick}
                />
                <AddLayerButton
                  availableCategories={availableCategories}
                  onAddLayer={handleAddLayer}
                />
              </div>

              {/* Selection controls */}
              {selectedItems.length > 0 && (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <span className="text-sm font-medium">
                    {selectedItems.length} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* All Items Grid */}
              <WardrobeAllItemsGrid
                items={allItems}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                onAddNew={() => handleAddItemToLayer()}
              />

              {/* Layered Carousels */}
              <div className="space-y-4">
                {layers.map((layer) => (
                  <div key={layer.id} id={`layer-${layer.category}`}>
                    <WardrobeLayerCarousel
                      layer={layer}
                      items={getLayerItems(layer.category)}
                      selectedItems={selectedItems}
                      onToggleItem={handleToggleItem}
                      onPinToggle={() => handlePinToggle(layer.id, layer.is_pinned)}
                      onRemoveLayer={() => handleRemoveLayer(layer.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Empty state for when no layers exist */}
              {layers.length === 0 && !layersLoading && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Add items to your wardrobe to organize them into layers
                  </p>
                  <Button onClick={() => handleAddItemToLayer()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Item
                  </Button>
                </Card>
              )}
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
                          navigate(`/dress-me/outfit/${fit.id}`);
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
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-40">
        <div className="container max-w-6xl mx-auto">
          <Button
            onClick={handleDone}
            size="lg"
            className="w-full"
          >
            {selectedItems.length > 0 
              ? `Create Outfit with ${selectedItems.length} items`
              : 'Go to Canvas'
            }
          </Button>
        </div>
      </div>

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
