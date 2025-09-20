import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Grid3X3, 
  Layers, 
  Upload, 
  Save, 
  Share2, 
  Eye, 
  ArrowLeft,
  Undo,
  Redo,
  Move,
  RotateCw,
  Square,
  Circle
} from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useCreateLook, useUpdateLook, usePublishLook } from '@/hooks/useLooks';
import { useEnhancedClosetItems } from '@/hooks/useEnhancedClosets';
import { toast } from '@/hooks/use-toast';
import { ClosetGrid } from './ClosetGrid';
import { AutoLayoutBoardCanvas } from './AutoLayoutBoardCanvas';
import { TemplateSelector } from './TemplateSelector';
import { ProductQuickView } from './ProductQuickView';
import { PublishDialog } from './PublishDialog';

interface MoodBoardBuilderProps {
  closetId: string;
  lookId?: string;
  onClose: () => void;
}

export const MoodBoardBuilder: React.FC<MoodBoardBuilderProps> = ({
  closetId,
  lookId,
  onClose
}) => {
  const isMobile = useIsMobile();
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
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  
  const createLookMutation = useCreateLook();
  const updateLookMutation = useUpdateLook();
  const publishLookMutation = usePublishLook();

  const { data: closetItems = [] } = useEnhancedClosetItems(
    closetId, 
    'all', 
    searchQuery, 
    categoryFilter
  );

  // Auto-save functionality
  const handleAutoSave = useCallback(async () => {
    if (!lookId) return;
    
    try {
      await updateLookMutation.mutateAsync({
        lookId,
        updates: { canvas: boardState }
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [lookId, boardState, updateLookMutation]);

  // Save board state to history for undo/redo
  const saveToHistory = useCallback((newState: any) => {
    setBoardState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newState);
      
      return {
        ...newState,
        history: newHistory.slice(-20), // Keep last 20 states
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

  // Handle drag start from closet
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

      // Create new slot for the dropped item
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

  // Handle save
  const handleSave = async () => {
    if (!lookId) {
      // Create new look
      try {
        const result = await createLookMutation.mutateAsync({
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
    } else {
      // Update existing look
      handleAutoSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Top Bar */}
      <div className={`border-b bg-card ${isMobile ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-2' : ''}`}>
          <div className={`flex items-center ${isMobile ? 'gap-2 w-full justify-between' : 'gap-4'}`}>
            <Button variant="ghost" size={isMobile ? "sm" : "sm"} onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {isMobile ? 'Back' : 'Back to Closet'}
            </Button>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleUndo}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRedo}>
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTemplates(true)}
              className={isMobile ? 'flex-1' : ''}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              {isMobile ? 'Templates' : 'Templates'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleSave} className={isMobile ? 'flex-1' : ''}>
              <Save className="h-4 w-4 mr-1" />
              {isMobile ? 'Save' : 'Save Draft'}
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setShowPublishDialog(true)}
              className={isMobile ? 'flex-1' : ''}
            >
              <Share2 className="h-4 w-4 mr-1" />
              {isMobile ? 'Publish' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
          {/* Left Drawer - Closet Items */}
          <ResizablePanel defaultSize={isMobile ? 30 : 25} minSize={isMobile ? 25 : 20} maxSize={isMobile ? 40 : 35}>
            <div className={`h-full bg-muted/50 ${isMobile ? 'border-b' : 'border-r'}`}>
              <div className={`border-b ${isMobile ? 'p-2' : 'p-4'}`}>
                <div className="space-y-3">
                  <Input
                    placeholder={isMobile ? "Search..." : "Search items..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={isMobile ? 'text-sm' : ''}
                  />
                </div>
              </div>
              
              <div className={`overflow-auto ${isMobile ? 'h-[calc(100%-60px)]' : 'h-[calc(100%-80px)]'}`}>
                <ClosetGrid
                  items={closetItems}
                  onDragStart={handleDragStart}
                  onItemClick={setSelectedProduct}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={!isMobile} />

          {/* Center - Canvas */}
          <ResizablePanel defaultSize={isMobile ? 45 : 50} minSize={isMobile ? 35 : 40}>
            <div className="h-full relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto">
              <AutoLayoutBoardCanvas
                ref={canvasRef}
                boardState={{
                  canvas: boardState.canvas,
                  items: boardState.slots
                    .filter((slot: any) => slot.item)
                    .map((slot: any) => ({
                      id: slot.id,
                      item: slot.item
                    })),
                  selectedItemIds: []
                }}
                setBoardState={(newState: any) => {
                  // Convert back to old format for compatibility
                  setBoardState(prev => ({
                    ...prev,
                    slots: newState.items.map((item: any, index: number) => ({
                      id: item.id,
                      x: 100 + (index % 3) * 180,
                      y: 100 + Math.floor(index / 3) * 200,
                      w: 160,
                      h: 200,
                      type: 'square' as const,
                      size: 'M' as const,
                      mask: 'rect' as const,
                      padding: 8,
                      itemId: item.item?.id,
                      item: item.item
                    }))
                  }));
                }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                isDragging={isDragging}
                dragPreview={dragPreview}
                saveToHistory={saveToHistory}
              />
            </div>
          </ResizablePanel>

          {!isMobile && (
            <>
              <ResizableHandle />

              {/* Right Drawer - Inspector */}
              <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                <div className="h-full border-l bg-muted/50">
                  <div className="p-4 border-b">
                    <h3 className="font-medium">Inspector</h3>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {boardState.selectedSlotIds.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Selected Item</h4>
                        {/* Slot controls would go here */}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Canvas Settings</h4>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Background</label>
                          <div className="flex gap-2">
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
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Modals */}
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

      <ProductQuickView
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <PublishDialog
        open={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        onPublish={async (metadata) => {
          if (lookId) {
            await publishLookMutation.mutateAsync({
              lookId,
              ...metadata
            });
            setShowPublishDialog(false);
            onClose();
          }
        }}
      />
    </div>
  );
};