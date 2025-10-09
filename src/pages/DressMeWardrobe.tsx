import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WardrobeGrid } from '@/components/WardrobeGrid';
import { WardrobeCategoryTabs } from '@/components/WardrobeCategoryTabs';
import { WardrobeUploadModal } from '@/components/WardrobeUploadModal';
import { useWardrobeItems, WardrobeItem } from '@/hooks/useWardrobeItems';
import { SEOHead } from '@/components/SEOHead';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { usePublicFits } from '@/hooks/useFits';
import { OutfitPreviewCard } from '@/components/OutfitPreviewCard';
import { useDressMeAnalytics } from '@/hooks/useDressMeAnalytics';

export default function DressMeWardrobe() {
  const navigate = useNavigate();
  const { data: allItems = [], isLoading } = useWardrobeItems();
  const { data: userFits = [] } = usePublicFits();
  const analytics = useDressMeAnalytics();

  const [activeTab, setActiveTab] = useState<'clothes' | 'outfits'>('clothes');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  React.useEffect(() => {
    analytics.open();
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return allItems;
    return allItems.filter(item => item.category === selectedCategory);
  }, [allItems, selectedCategory]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(filteredItems.map(item => item.id));
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
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="clothes" className="text-sm md:text-base">
                Clothes
              </TabsTrigger>
              <TabsTrigger value="outfits" className="text-sm md:text-base">
                Outfits
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
                  onSelect={setSelectedCategory}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      Select All
                    </Button>
                  </div>
                </div>
              )}

              {/* Wardrobe Grid */}
              <WardrobeGrid
                items={filteredItems}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                onAddNew={() => setIsUploadModalOpen(true)}
              />
            </TabsContent>

            <TabsContent value="outfits" className="mt-4 space-y-4">
              {/* Occasion filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', 'Work', 'Casual', 'Home', 'School', 'Date'].map((occasion) => (
                  <Button
                    key={occasion}
                    variant={occasion === 'All' ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0 rounded-full"
                  >
                    {occasion}
                  </Button>
                ))}
              </div>

              {/* Outfits Grid */}
              {userFits.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No saved outfits yet</p>
                  <Button onClick={handleDone}>
                    Create Your First Outfit
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userFits.map((fit) => (
                    <OutfitPreviewCard
                      key={fit.id}
                      fit={fit}
                      onClick={() => {
                        sessionStorage.setItem('dressme_load_fit', fit.id);
                        navigate('/dress-me/canvas');
                      }}
                    />
                  ))}
                </div>
              )}
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
        onClose={() => setIsUploadModalOpen(false)}
        onItemAdded={handleItemAdded}
      />
    </>
  );
}
