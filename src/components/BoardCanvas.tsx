import React, { forwardRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Move, RotateCw, X, Copy } from 'lucide-react';

interface Slot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'tall' | 'wide' | 'square' | 'free';
  size: 'S' | 'M' | 'L';
  mask?: 'rect' | 'round' | 'circle';
  padding?: number;
  rotation?: number;
  itemId?: string;
  item?: any;
}

interface BoardState {
  canvas: {
    width: number;
    height: number;
    background: { type: string; color: string };
  };
  slots: Slot[];
  selectedSlotIds: string[];
}

interface BoardCanvasProps {
  boardState: BoardState;
  setBoardState: React.Dispatch<React.SetStateAction<BoardState>>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDragging: boolean;
  dragPreview: any;
  saveToHistory: (state: BoardState) => void;
}

export const BoardCanvas = forwardRef<HTMLDivElement, BoardCanvasProps>(({
  boardState,
  setBoardState,
  onDrop,
  onDragOver,
  isDragging,
  dragPreview,
  saveToHistory
}, ref) => {
  const GRID_SIZE = 8;

  // Snap position to grid
  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  // Handle slot selection
  const handleSlotSelect = useCallback((slotId: string, isMultiSelect = false) => {
    setBoardState(prev => ({
      ...prev,
      selectedSlotIds: isMultiSelect 
        ? prev.selectedSlotIds.includes(slotId)
          ? prev.selectedSlotIds.filter(id => id !== slotId)
          : [...prev.selectedSlotIds, slotId]
        : [slotId]
    }));
  }, [setBoardState]);

  // Handle slot movement
  const handleSlotMove = useCallback((slotId: string, deltaX: number, deltaY: number) => {
    setBoardState(prev => {
      const newSlots = prev.slots.map(slot => {
        if (slot.id === slotId) {
          return {
            ...slot,
            x: snapToGrid(Math.max(0, slot.x + deltaX)),
            y: snapToGrid(Math.max(0, slot.y + deltaY))
          };
        }
        return slot;
      });

      return { ...prev, slots: newSlots };
    });
  }, [setBoardState, snapToGrid]);

  // Handle slot resize
  const handleSlotResize = useCallback((slotId: string, newW: number, newH: number) => {
    setBoardState(prev => {
      const newSlots = prev.slots.map(slot => {
        if (slot.id === slotId) {
          return {
            ...slot,
            w: snapToGrid(Math.max(50, newW)),
            h: snapToGrid(Math.max(50, newH))
          };
        }
        return slot;
      });

      return { ...prev, slots: newSlots };
    });
  }, [setBoardState, snapToGrid]);

  // Handle slot deletion
  const handleSlotDelete = useCallback((slotId: string) => {
    const newState = {
      ...boardState,
      slots: boardState.slots.filter(slot => slot.id !== slotId),
      selectedSlotIds: boardState.selectedSlotIds.filter(id => id !== slotId)
    };
    saveToHistory(newState);
  }, [boardState, saveToHistory]);

  // Handle slot duplication
  const handleSlotDuplicate = useCallback((slotId: string) => {
    const slot = boardState.slots.find(s => s.id === slotId);
    if (!slot) return;

    const newSlot = {
      ...slot,
      id: `slot_${Date.now()}`,
      x: slot.x + 20,
      y: slot.y + 20
    };

    const newState = {
      ...boardState,
      slots: [...boardState.slots, newSlot]
    };
    saveToHistory(newState);
  }, [boardState, saveToHistory]);

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
      className="relative w-full h-full overflow-auto bg-gradient-to-br from-gray-50 to-white"
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
      }}
    >
      {/* Canvas Container */}
      <div 
        className="relative w-full max-w-4xl mx-auto h-80 shadow-2xl rounded-lg overflow-hidden"
        style={{
          backgroundColor: boardState.canvas.background.color,
          aspectRatio: `${boardState.canvas.width} / ${boardState.canvas.height}`
        }}
      >
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE * 4}px ${GRID_SIZE * 4}px`
          }}
        />

        {/* Drop zone overlay when dragging */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-primary font-medium">Drop item here</p>
              {dragPreview && (
                <p className="text-sm text-muted-foreground mt-1">
                  {dragPreview.title || 'Item'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Slots */}
        {boardState.slots.map((slot) => (
          <SlotComponent
            key={slot.id}
            slot={slot}
            isSelected={boardState.selectedSlotIds.includes(slot.id)}
            onSelect={(isMulti) => handleSlotSelect(slot.id, isMulti)}
            onMove={(dx, dy) => handleSlotMove(slot.id, dx, dy)}
            onResize={(w, h) => handleSlotResize(slot.id, w, h)}
            onDelete={() => handleSlotDelete(slot.id)}
            onDuplicate={() => handleSlotDuplicate(slot.id)}
            formatPrice={formatPrice}
          />
        ))}
      </div>

      {/* Instructions */}
      {boardState.slots.length === 0 && !isDragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-muted-foreground">
              Create Your Look
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag items from your closet to start building your mood board
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

BoardCanvas.displayName = 'BoardCanvas';

// Individual slot component
interface SlotComponentProps {
  slot: Slot;
  isSelected: boolean;
  onSelect: (isMultiSelect: boolean) => void;
  onMove: (deltaX: number, deltaY: number) => void;
  onResize: (width: number, height: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  formatPrice: (cents?: number, currency?: string) => string;
}

const SlotComponent: React.FC<SlotComponentProps> = ({
  slot,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
  formatPrice
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - slot.x, y: e.clientY - slot.y });
    onSelect(e.metaKey || e.ctrlKey);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    onMove(newX - slot.x, newY - slot.y);
  }, [isDragging, dragStart, onMove, slot.x, slot.y]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`absolute group cursor-move ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.w,
        height: slot.h,
        transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Slot content */}
      <Card className="w-full h-full border-2 border-dashed border-gray-300 bg-white/80 backdrop-blur-sm overflow-hidden">
        {slot.item ? (
          <div className="relative w-full h-full">
            <img
              src={slot.item.image_bg_removed_url || slot.item.image_url || '/placeholder.svg'}
              alt={slot.item.title || 'Item'}
              className="w-full h-full object-contain p-2"
              style={{
                borderRadius: slot.mask === 'circle' ? '50%' : 
                           slot.mask === 'round' ? '8px' : '0px'
              }}
            />
            
            {/* Item info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs font-medium truncate">
                {slot.item.title}
              </p>
              {slot.item.price_cents && (
                <p className="text-white/80 text-xs">
                  {formatPrice(slot.item.price_cents, slot.item.currency)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-xs">Drop item here</span>
          </div>
        )}
      </Card>

      {/* Selection controls */}
      {isSelected && (
        <>
          {/* Resize handle */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-se-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
            }}
          />

          {/* Action buttons */}
          <div className="absolute -top-8 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="secondary" onClick={onDuplicate}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};