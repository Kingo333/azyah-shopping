import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWishlistProducts } from '@/hooks/useWishlistProducts';
import { useProducts } from '@/hooks/useProducts';
import { useEnhancedClosetItems } from '@/hooks/useEnhancedClosets';
import { useCreateLook, useUpdateLook } from '@/hooks/useLooks';
import { Palette, Heart, ShoppingBag, Plus, Grid3X3, Save, Share2, Square, Undo, Redo } from 'lucide-react';
import { BoardCanvas } from '@/components/BoardCanvas';
import { TemplateSelector } from '@/components/TemplateSelector';
import { toast } from '@/hooks/use-toast';

interface CreateLookSectionProps {
  closetId?: string;
}

export const CreateLookSection: React.FC<CreateLookSectionProps> = ({ closetId }) => {
  const [boardState, setBoardState] = useState({
    canvas: {
      width: 1080,
      height: 1440,
      background: { type: 'solid', color: '#F6F6F4' }
    },
    slots: [],
    selectedSlotIds: [],
    history: [],
    historyIndex: -1
  });

  const [showTemplates, setShowTemplates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState(null);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [closetCollapsed, setClosetCollapsed] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const createLookMutation = useCreateLook();
  const updateLookMutation = useUpdateLook();

  const { wishlistProducts, isLoading: wishlistLoading } = useWishlistProducts();
  const { data: products, isLoading: productsLoading } = useProducts({ limit: 50 });
  const { data: closetItems = [] } = useEnhancedClosetItems(closetId || '', 'all', searchQuery);

  // Save board state to history for undo/redo
  const saveToHistory = useCallback((newState: any) => {
    setBoardState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newState);
      
      return {
        ...newState,
        history: newHistory.slice(-20),
        historyIndex: Math.min(newHistory.length - 1, 19)
      };
    });
  }, []);

  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    setBoardState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        return {
          ...prev.history[newIndex],
          history: prev.history,
          historyIndex: newIndex
        };
      }
      return prev;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setBoardState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        return {
          ...prev.history[newIndex],
          history: prev.history,
          historyIndex: newIndex
        };
      }
      return prev;
    });
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((item: any, e: React.DragEvent) => {
    setIsDragging(true);
    setDragPreview(item);
    
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handle drop on canvas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragPreview(null);

    try {
      const item = JSON.parse(e.dataTransfer.getData('application/json'));
      const rect = canvasRef.current?.getBoundingClientRect();
      
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newSlot = {
        id: `slot_${Date.now()}`,
        x: Math.max(0, x - 50),
        y: Math.max(0, y - 50),
        w: 200,
        h: 200,
        type: 'square' as const,
        size: 'M' as const,
        mask: 'rect' as const,
        padding: 12,
        itemId: item.id,
        item: item
      };

      const newState = {
        ...boardState,
        slots: [...boardState.slots, newSlot]
      };

      saveToHistory(newState);
      toast({
        title: "Item added",
        description: "Item has been added to your mood board."
      });
    } catch (error) {
      console.error('Drop failed:', error);
    }
  }, [boardState, saveToHistory]);

  const handleSave = async () => {
    try {
      await createLookMutation.mutateAsync({
        title: 'Untitled Look',
        canvas: boardState
      });
      
      toast({
        title: "Look saved",
        description: "Your mood board has been saved."
      });
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const formatPrice = (priceCents: number, currency: string) => {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const getImageUrl = (item: any) => {
    if (item.image_url) return item.image_url;
    if (item.media_urls && Array.isArray(item.media_urls) && item.media_urls.length > 0) {
      return item.media_urls[0];
    }
    if (item.product?.media_urls && Array.isArray(item.product.media_urls) && item.product.media_urls.length > 0) {
      return item.product.media_urls[0];
    }
    return '/placeholder.svg';
  };

  if (!closetId) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
        <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Create a closet first to start creating looks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between bg-card p-2 md:p-4 rounded-lg border">
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 w-8 md:h-10 md:w-auto px-2 md:px-3">
            <Undo className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline ml-1">Undo</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} className="h-8 w-8 md:h-10 md:w-auto px-2 md:px-3">
            <Redo className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline ml-1">Redo</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowTemplates(true)}
            className="h-8 px-2 md:h-10 md:px-3"
          >
            <Grid3X3 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline ml-1 md:ml-2 text-xs md:text-sm">Templates</span>
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleSave} className="h-8 px-2 md:h-10 md:px-3">
            <Save className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline ml-1 md:ml-2 text-xs md:text-sm">Save</span>
          </Button>
          
          <Button variant="default" size="sm" className="h-8 px-2 md:h-10 md:px-3">
            <Share2 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline ml-1 md:ml-2 text-xs md:text-sm">Publish</span>
          </Button>
        </div>
      </div>

      {/* Main Mood Board Interface */}
      <div className="h-[400px] md:h-[600px] border rounded-lg overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Closet Items */}
          {!closetCollapsed && (
            <>
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40} className="md:defaultSize-25 md:minSize-20 md:maxSize-35">
                <div className="h-full border-r bg-muted/30">
                  <div className="p-2 md:p-4 border-b">
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs md:text-sm"
                    />
                  </div>
                  
                  <div className="h-[calc(100%-60px)] md:h-[calc(100%-80px)] overflow-auto">
                    {closetItems.length > 0 ? (
                      <div className="p-1 md:p-2">
                        <div className="flex justify-between items-center mb-1 md:mb-2">
                          <span className="text-xs font-medium">Closet Items</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setClosetCollapsed(true)}
                            className="shadow-md hover:shadow-lg transition-shadow"
                          >
                            <span className="text-xs">hide</span>
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                          {closetItems.map((item) => (
                            <Card 
                              key={item.id}
                              className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                              draggable
                              onDragStart={(e) => handleDragStart(item, e)}
                            >
                              <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                                <img 
                                  src={getImageUrl(item)} 
                                  alt={item.title || 'Item'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-1 md:p-2">
                                <p className="text-xs font-medium line-clamp-1">
                                  {item.title || 'Untitled'}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 md:p-4">
                        <div className="flex justify-between items-center mb-1 md:mb-2">
                          <span className="text-xs font-medium">Closet Items</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setClosetCollapsed(true)}
                            className="shadow-md hover:shadow-lg transition-shadow"
                          >
                            <span className="text-xs">hide</span>
                          </Button>
                        </div>
                        <div className="text-center py-4 md:py-8">
                          <p className="text-xs text-muted-foreground">No items in this closet yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Add items to start creating looks</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          {/* Center Panel - Canvas */}
          <ResizablePanel defaultSize={40} minSize={35} className="md:defaultSize-50 md:minSize-40">
            <div className="h-full relative bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              {/* Collapse buttons for minimized panels */}
              {closetCollapsed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setClosetCollapsed(false)}
                  className="absolute left-1 md:left-2 top-1 md:top-2 z-10 shadow-lg hover:shadow-xl transition-shadow bg-background/90 backdrop-blur-sm"
                >
                  <span className="text-xs">open closet</span>
                </Button>
              )}
              
              {inspectorCollapsed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setInspectorCollapsed(false)}
                  className="absolute right-1 md:right-2 top-1 md:top-2 z-10 shadow-lg hover:shadow-xl transition-shadow bg-background/90 backdrop-blur-sm"
                >
                  <span className="text-xs">open inspector</span>
                </Button>
              )}
              
              {boardState.slots.length === 0 ? (
                <div 
                  className="text-center p-4 md:p-8 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-background/50 mx-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <Palette className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground mx-auto mb-2 md:mb-4" />
                  <h3 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">Create Your Look</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Drag items from your closet to start building your mood board</p>
                </div>
              ) : (
                <BoardCanvas
                  ref={canvasRef}
                  boardState={boardState}
                  setBoardState={setBoardState}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  isDragging={isDragging}
                  dragPreview={dragPreview}
                  saveToHistory={saveToHistory}
                />
              )}
            </div>
          </ResizablePanel>

          {/* Right Panel - Inspector */}
          {!inspectorCollapsed && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40} className="md:defaultSize-25 md:minSize-20 md:maxSize-35">
                <div className="h-full border-l bg-muted/30">
                  <div className="p-2 md:p-4 border-b flex justify-between items-center">
                    <h3 className="text-sm md:text-base font-medium">Inspector</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setInspectorCollapsed(true)}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <span className="text-xs">hide</span>
                    </Button>
                  </div>
                  
                  <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                    <div className="space-y-2 md:space-y-3">
                      <h4 className="text-xs md:text-sm font-medium">Canvas Settings</h4>
                      
                      <div className="space-y-1 md:space-y-2">
                        <label className="text-xs font-medium">Background</label>
                        <div className="flex gap-1 md:gap-2">
                          <Button
                            variant={boardState.canvas.background.type === 'solid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newState = {
                                ...boardState,
                                canvas: {
                                  ...boardState.canvas,
                                  background: { type: 'solid', color: '#F6F6F4' }
                                }
                              };
                              saveToHistory(newState);
                            }}
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Wishlist Carousel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">From Your Wishlist</h3>
          <Badge variant="secondary">{wishlistProducts.length}</Badge>
        </div>
        
        {wishlistLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-48 h-64 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : wishlistProducts.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {wishlistProducts.map((item) => (
                <CarouselItem key={item.id} className="pl-2 basis-48">
                  <Card 
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={(e) => handleDragStart(item.product, e)}
                  >
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                      <img 
                        src={getImageUrl(item.product)} 
                        alt={item.product?.title || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">
                        {item.product?.title || 'Untitled'}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.product?.brand_id || 'Unknown Brand'}
                      </p>
                      <p className="font-semibold text-sm">
                        {formatPrice(item.product?.price_cents || 0, item.product?.currency || 'USD')}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No items in your wishlist yet</p>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          <h3 className="text-lg font-semibold">All Products</h3>
          <Badge variant="secondary">{products?.length || 0}</Badge>
        </div>
        
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => handleDragStart(product, e)}
              >
                <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                  <img 
                    src={getImageUrl(product)} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-2">
                  <h4 className="font-medium text-xs line-clamp-2 mb-1">
                    {product.title}
                  </h4>
                  <p className="font-semibold text-xs">
                    {formatPrice(product.price_cents, product.currency)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No products available</p>
          </div>
        )}
      </div>

      {/* Template Selector Modal */}
      <TemplateSelector
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={(template) => {
          const newState = {
            ...boardState,
            slots: template.slots || []
          };
          saveToHistory(newState);
          setShowTemplates(false);
        }}
      />
    </div>
  );
};