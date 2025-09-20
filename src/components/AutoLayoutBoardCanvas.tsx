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
  
  // Smart grid layout system with smaller sizing
  const calculateAutoLayout = useCallback((items: BoardItem[]) => {
    if (items.length === 0) return items;
    
    const containerWidth = isMobile ? 220 : 480; // Much smaller: mobile 220px, desktop 480px
    const padding = 8; // Reduced from 12
    const gap = 6; // Reduced from 8
    
    // Calculate optimal columns based on item count
    const cols = Math.min(
      items.length <= 2 ? 2 : 
      items.length <= 4 ? 2 :
      items.length <= 6 ? 3 :
      items.length <= 9 ? 3 : 4,
      Math.floor(containerWidth / 80) // Much smaller min width for tighter fit
    );
    
    const itemWidth = (containerWidth - (padding * 2) - (gap * (cols - 1))) / cols;
    const itemHeight = itemWidth * (4/3); // Keep 3:4 aspect ratio to match ProductCard
    
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

  // Calculate dynamic canvas dimensions - smaller to avoid scrolling
  const canvasDimensions = useMemo(() => {
    if (layoutedItems.length === 0) {
      return { width: isMobile ? 220 : 480, height: isMobile ? 120 : 200 }; // Much smaller
    }
    
    const padding = 8;
    const maxX = Math.max(...layoutedItems.map(item => 
      (item.position?.x || 0) + (item.size?.width || 0)
    ));
    const maxY = Math.max(...layoutedItems.map(item => 
      (item.position?.y || 0) + (item.size?.height || 0)
    ));
    
    return {
      width: Math.max(isMobile ? 280 : 600, maxX + padding),
      height: Math.max(isMobile ? 160 : 280, maxY + padding) // Reduced max heights
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
      className="relative w-full h-full overflow-auto bg-gradient-to-br from-slate-50 to-white p-2" // Added padding for mobile
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Canvas Container - very compact for mobile */}
      <div 
        className="relative mx-auto shadow-md rounded-lg overflow-visible transition-all duration-300" 
        style={{
          backgroundColor: boardState.canvas.background.color,
          width: canvasDimensions.width,
          height: canvasDimensions.height,
          minHeight: isMobile ? '120px' : '200px' // Much smaller min heights
        }}
      >
        {/* Drop zone overlay when dragging */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/20 rounded-lg flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="text-center p-3"> {/* Reduced padding */}
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center"> {/* Smaller icon */}
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <p className="text-primary font-medium text-sm">Add to board</p> {/* Smaller text */}
              {dragPreview && (
                <p className="text-xs text-muted-foreground mt-1"> {/* Smaller text */}
                  {dragPreview.title || 'Item'} will be positioned automatically
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
            <div className="text-center space-y-2 p-4"> {/* Reduced spacing and padding */}
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"> {/* Smaller */}
                <Heart className="w-6 h-6 text-primary/50" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1"> {/* Smaller text */}
                  Create Your Look
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs"> {/* Smaller text */}
                  Drag items here for auto-layout
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
      {/* Item Card - matches ProductCard styling */}
      <Card className="w-full h-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
        <div className="relative w-full h-full">
          {/* Image container with 3:4 aspect ratio like ProductCard */}
          <div className="w-full h-full overflow-hidden rounded-2xl">
            <img
              src={getPrimaryImageUrl(item)}
              alt={item.title || 'Item'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              draggable={false}
            />
          </div>
          
          {/* Hover gradient overlay - matches ProductCard */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Item Info overlay - matches ProductCard */}
          <div className="absolute bottom-2 left-2 right-2 bg-white/60 backdrop-blur-sm rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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