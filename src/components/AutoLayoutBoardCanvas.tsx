import React, { forwardRef, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Heart, Share2 } from 'lucide-react';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { useIsMobile } from '@/hooks/use-mobile';

interface BoardItem {
  id: string;
  item: any;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

interface BoardState {
  canvas: {
    width: number;
    height: number;
    background: { type: string; color: string };
  };
  items: BoardItem[];
  selectedItemIds: string[];
}

interface AutoLayoutBoardCanvasProps {
  boardState: BoardState;
  setBoardState: React.Dispatch<React.SetStateAction<BoardState>>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDragging: boolean;
  dragPreview: any;
  saveToHistory: (state: BoardState) => void;
}

export const AutoLayoutBoardCanvas = forwardRef<HTMLDivElement, AutoLayoutBoardCanvasProps>(({
  boardState,
  setBoardState,
  onDrop,
  onDragOver,
  isDragging,
  dragPreview,
  saveToHistory
}, ref) => {
  const isMobile = useIsMobile();
  
  // Smart grid layout system
  const calculateAutoLayout = useCallback((items: BoardItem[]) => {
    if (items.length === 0) return items;
    
    const containerWidth = isMobile ? 320 : 800;
    const padding = 16;
    const gap = 12;
    
    // Calculate optimal columns based on item count
    const cols = Math.min(
      items.length <= 2 ? 2 : 
      items.length <= 4 ? 2 :
      items.length <= 6 ? 3 :
      items.length <= 9 ? 3 : 4,
      Math.floor(containerWidth / 180) // Min item width + gap
    );
    
    const itemWidth = (containerWidth - (padding * 2) - (gap * (cols - 1))) / cols;
    const itemHeight = itemWidth * 1.2; // Slightly taller aspect ratio
    
    return items.map((item, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const x = padding + (col * (itemWidth + gap));
      const y = padding + (row * (itemHeight + gap));
      
      return {
        ...item,
        position: { x, y },
        size: { width: itemWidth, height: itemHeight }
      };
    });
  }, [isMobile]);

  // Auto-layout items whenever items change
  const layoutedItems = useMemo(() => {
    return calculateAutoLayout(boardState.items);
  }, [boardState.items, calculateAutoLayout]);

  // Calculate dynamic canvas dimensions
  const canvasDimensions = useMemo(() => {
    if (layoutedItems.length === 0) {
      return { width: isMobile ? 320 : 800, height: isMobile ? 200 : 400 };
    }
    
    const padding = 16;
    const maxX = Math.max(...layoutedItems.map(item => 
      (item.position?.x || 0) + (item.size?.width || 0)
    ));
    const maxY = Math.max(...layoutedItems.map(item => 
      (item.position?.y || 0) + (item.size?.height || 0)
    ));
    
    return {
      width: Math.max(isMobile ? 320 : 800, maxX + padding),
      height: Math.max(isMobile ? 200 : 400, maxY + padding)
    };
  }, [layoutedItems, isMobile]);

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string) => {
    setBoardState(prev => ({
      ...prev,
      selectedItemIds: prev.selectedItemIds.includes(itemId)
        ? prev.selectedItemIds.filter(id => id !== itemId)
        : [itemId]
    }));
  }, [setBoardState]);

  // Handle item deletion
  const handleItemDelete = useCallback((itemId: string) => {
    const newState = {
      ...boardState,
      items: boardState.items.filter(item => item.id !== itemId),
      selectedItemIds: boardState.selectedItemIds.filter(id => id !== itemId)
    };
    setBoardState(newState);
    saveToHistory(newState);
  }, [boardState, setBoardState, saveToHistory]);

  const formatPrice = (cents?: number, currency = 'USD') => {
    if (!cents) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <div 
      ref={ref}
      className="relative w-full h-full overflow-auto bg-gradient-to-br from-slate-50 to-white"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Canvas Container */}
      <div 
        className="relative mx-auto shadow-lg rounded-xl overflow-visible transition-all duration-300"
        style={{
          backgroundColor: boardState.canvas.background.color,
          width: canvasDimensions.width,
          height: canvasDimensions.height,
          minHeight: isMobile ? '200px' : '400px'
        }}
      >
        {/* Drop zone overlay when dragging */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/20 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <p className="text-primary font-medium text-lg">Add to your mood board</p>
              {dragPreview && (
                <p className="text-sm text-muted-foreground mt-2">
                  {dragPreview.title || 'Item'} will be automatically positioned
                </p>
              )}
            </div>
          </div>
        )}

        {/* Auto-positioned Items */}
        {layoutedItems.map((boardItem) => (
          <AutoPositionedItem
            key={boardItem.id}
            boardItem={boardItem}
            isSelected={boardState.selectedItemIds.includes(boardItem.id)}
            onSelect={() => handleItemSelect(boardItem.id)}
            onDelete={() => handleItemDelete(boardItem.id)}
            formatPrice={formatPrice}
          />
        ))}

        {/* Empty state */}
        {boardState.items.length === 0 && !isDragging && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Heart className="w-10 h-10 text-primary/50" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Start Creating Your Look
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  Drag items from your closet here. They'll automatically arrange themselves beautifully.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      {boardState.items.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="flex items-center gap-2 p-2 shadow-lg bg-background/95 backdrop-blur-sm">
            <Button size="sm" variant="outline" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Save Look
            </Button>
            <Button size="sm" variant="outline" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
});

AutoLayoutBoardCanvas.displayName = 'AutoLayoutBoardCanvas';

// Individual item component with auto-positioning
interface AutoPositionedItemProps {
  boardItem: BoardItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  formatPrice: (cents?: number, currency?: string) => string;
}

const AutoPositionedItem: React.FC<AutoPositionedItemProps> = ({
  boardItem,
  isSelected,
  onSelect,
  onDelete,
  formatPrice
}) => {
  const isMobile = useIsMobile();
  const { item, position, size } = boardItem;

  if (!position || !size) return null;

  return (
    <div
      className={`absolute group transition-all duration-300 cursor-pointer hover:scale-105 hover:z-10 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105 z-10' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      onClick={onSelect}
    >
      {/* Item Card */}
      <Card className="w-full h-full overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300">
        <div className="relative w-full h-full">
          {/* Image */}
          <div className="w-full h-3/4 overflow-hidden">
            <img
              src={getPrimaryImageUrl(item)}
              alt={item.title || 'Item'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              draggable={false}
            />
          </div>
          
          {/* Item Info */}
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-white p-2 flex flex-col justify-center">
            <p className="text-xs font-medium text-foreground truncate">
              {item.title}
            </p>
            {item.price_cents && (
              <p className="text-xs text-primary font-semibold">
                {formatPrice(item.price_cents, item.currency)}
              </p>
            )}
          </div>

          {/* Delete button - only visible when selected */}
          {isSelected && (
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </Card>
    </div>
  );
};