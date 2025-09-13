import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDefaultCloset } from '@/hooks/useDefaultCloset';
import { useEnhancedClosetItems, EnhancedClosetItem } from '@/hooks/useEnhancedClosets';
import { StyleBoardBuilder } from '@/components/StyleBoardBuilder';
import { AddItemModal } from '@/components/AddItemModal';
import { ItemDetailModal } from '@/components/ItemDetailModal';
import { OutfitTemplatesSection } from '@/components/OutfitTemplatesSection';
import { PublishLookModal } from '@/components/PublishLookModal';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Palette, Sparkles, Heart, Search, Grid3X3, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const Closets = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('wardrobe');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStyleBoard, setShowStyleBoard] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnhancedClosetItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'categories'>('categories');
  const [selectedLookForPublish, setSelectedLookForPublish] = useState<any>(null);
  
  const { defaultCloset, isLoading: closetLoading } = useDefaultCloset();
  const { data: closetItems = [], isLoading: itemsLoading } = useEnhancedClosetItems(
    defaultCloset?.id || '', 
    'all',
    searchQuery.trim() || undefined
  );

  const categorizedItems = closetItems.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  if (showStyleBoard) {
    return <StyleBoardBuilder onClose={() => setShowStyleBoard(false)} />;
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <BackButton fallbackPath="/" />
          <div>
            <h1 className="text-3xl font-bold">My Wardrobe</h1>
            <p className="text-muted-foreground">
              Your personal style collection and outfit builder
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Button 
            onClick={() => setShowStyleBoard(true)}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80"
          >
            <Palette className="h-4 w-4" />
            Create Style
          </Button>
          
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant={viewMode === 'categories' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('categories')}
              className="gap-2"
            >
              <Layers className="h-4 w-4" />
              Categories
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Grid
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search your wardrobe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="wardrobe" className="gap-2">
            <Heart className="h-4 w-4" />
            My Wardrobe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wardrobe" className="space-y-6">
          {/* Outfit Templates Section */}
          <OutfitTemplatesSection 
            onCreateFromTemplate={() => setShowStyleBoard(true)}
            onOpenStyleBoard={() => setShowStyleBoard(true)}
          />

          {closetLoading || itemsLoading ? (
            <LoadingFallback />
          ) : closetItems.length === 0 ? (
            <EmptyWardrobeState 
              onAddItems={() => setShowAddModal(true)}
              onBrowseInspiration={() => navigate('/explore')}
            />
          ) : (
            <div className="space-y-6">
              {viewMode === 'categories' ? (
                // Category View
                <div className="space-y-8">
                  {Object.entries(categorizedItems).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant="secondary" className="capitalize text-sm">
                          {category.replace('_', ' ')}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                          {items.length} items
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {items.map((item) => (
                          <WardrobeItemCard 
                            key={item.id} 
                            item={item} 
                            onClick={() => setSelectedItem(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Grid View
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {closetItems.map((item) => (
                    <WardrobeItemCard 
                      key={item.id} 
                      item={item} 
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddItemModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
        onNavigateToExplore={() => navigate('/explore')}
      />
      
      <ItemDetailModal
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        item={selectedItem}
      />

      <PublishLookModal 
        open={!!selectedLookForPublish}
        onOpenChange={(open) => !open && setSelectedLookForPublish(null)}
        look={selectedLookForPublish}
        onPublished={() => {
          setSelectedLookForPublish(null);
          navigate('/explore');
        }}
      />
    </div>
  );
};

const WardrobeItemCard = ({ item, onClick }: { item: EnhancedClosetItem; onClick: () => void }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all hover:scale-105 group cursor-pointer border-2 hover:border-primary/20" onClick={onClick}>
      <div className="aspect-[3/4] relative overflow-hidden">
        <img
          src={item.image_url || '/placeholder.svg'}
          alt={item.title || 'Wardrobe item'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 left-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {item.brand && (
            <p className="text-xs opacity-80">{item.brand}</p>
          )}
        </div>
        {/* Click indicator */}
        <div className="absolute top-2 right-2 w-6 h-6 bg-primary/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="h-3 w-3 text-white" />
        </div>
      </div>
    </Card>
  );
};

const EmptyWardrobeState = ({ onAddItems, onBrowseInspiration }: { onAddItems: () => void; onBrowseInspiration: () => void }) => (
  <Card className="text-center py-12">
    <CardContent className="space-y-6">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
        <Heart className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Your wardrobe is empty</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Start building your style collection by adding items to your wardrobe. 
          You can upload photos, shop from brands, or create virtual pieces.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onAddItems} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Items
        </Button>
        <Button variant="outline" className="gap-2" onClick={onBrowseInspiration}>
          <Search className="h-4 w-4" />
          Browse Inspiration
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default Closets;