import React, { useRef, useState, useEffect } from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  RotateCw, ZoomIn, ZoomOut, Trash2, Copy, 
  Eye, EyeOff, ArrowUp, ArrowDown, FlipHorizontal
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CanvasLayer {
  id: string;
  wardrobeItem: WardrobeItem;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  opacity: number;
  flipH: boolean;
  visible: boolean;
  zIndex: number;
}

interface EnhancedInteractiveCanvasProps {
  layers: CanvasLayer[];
  onLayersChange: (layers: CanvasLayer[]) => void;
  background: {
    type: 'solid' | 'gradient' | 'pattern' | 'image';
    value: string;
  };
}

export const EnhancedInteractiveCanvas: React.FC<EnhancedInteractiveCanvasProps> = ({
  layers,
  onLayersChange,
  background,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialLayerPos, setInitialLayerPos] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const [lastTap, setLastTap] = useState(0);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSnapGuides, setShowSnapGuides] = useState(true);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});
  const [showTrashZone, setShowTrashZone] = useState(false);
  const [showScaleIndicator, setShowScaleIndicator] = useState(false);
  const [showRotateIndicator, setShowRotateIndicator] = useState(false);
  const dragThreshold = 2; // Reduced from 5px to 2px for more responsive touch

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowQuickMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const updateSelectedLayer = (updates: Partial<CanvasLayer['transform']> | { opacity?: number; flipH?: boolean; visible?: boolean }) => {
    if (!selectedLayerId) return;
    
    onLayersChange(
      layers.map(layer =>
        layer.id === selectedLayerId
          ? {
              ...layer,
              transform: { ...layer.transform, ...(updates as any) },
              ...('opacity' in updates && { opacity: updates.opacity }),
              ...('flipH' in updates && { flipH: updates.flipH }),
              ...('visible' in updates && { visible: updates.visible }),
            }
          : layer
      )
    );
  };

  const handleDelete = () => {
    if (!selectedLayerId) return;
    onLayersChange(layers.filter(l => l.id !== selectedLayerId));
    setSelectedLayerId(null);
    setShowQuickMenu(false);
  };

  const handleDuplicate = () => {
    if (!selectedLayerId) return;
    const layerToDuplicate = layers.find(l => l.id === selectedLayerId);
    if (!layerToDuplicate) return;

    const newLayer: CanvasLayer = {
      ...layerToDuplicate,
      id: crypto.randomUUID(),
      transform: {
        ...layerToDuplicate.transform,
        x: (layerToDuplicate.transform.x || 0) + 20,
        y: (layerToDuplicate.transform.y || 0) + 20,
      },
      zIndex: Math.max(...layers.map(l => l.zIndex)) + 1,
    };

    onLayersChange([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleFlipH = () => {
    if (!selectedLayerId || !selectedLayer) return;
    updateSelectedLayer({ flipH: !selectedLayer.flipH });
  };

  const handleOpacity = (value: number[]) => {
    updateSelectedLayer({ opacity: value[0] / 100 });
  };

  const handleRotate = (delta: number) => {
    if (!selectedLayer) return;
    updateSelectedLayer({ rotation: (selectedLayer.transform.rotation || 0) + delta });
    setShowRotateIndicator(true);
    setTimeout(() => setShowRotateIndicator(false), 1000);
  };

  const handleScale = (delta: number) => {
    if (!selectedLayer) return;
    const newScale = Math.max(0.1, Math.min(3, (selectedLayer.transform.scale || 1) + delta));
    updateSelectedLayer({ scale: newScale });
    setShowScaleIndicator(true);
    setTimeout(() => setShowScaleIndicator(false), 1000);
  };

  const handleToggleVisibility = () => {
    if (!selectedLayer) return;
    updateSelectedLayer({ visible: !selectedLayer.visible });
  };

  const handleBringForward = () => {
    if (!selectedLayerId) return;
    const currentLayer = layers.find(l => l.id === selectedLayerId);
    if (!currentLayer) return;

    const maxZ = Math.max(...layers.map(l => l.zIndex));
    if (currentLayer.zIndex >= maxZ) return;

    onLayersChange(
      layers.map(layer => {
        if (layer.id === selectedLayerId) {
          return { ...layer, zIndex: layer.zIndex + 1 };
        }
        if (layer.zIndex === currentLayer.zIndex + 1) {
          return { ...layer, zIndex: layer.zIndex - 1 };
        }
        return layer;
      })
    );
  };

  const handleSendBackward = () => {
    if (!selectedLayerId) return;
    const currentLayer = layers.find(l => l.id === selectedLayerId);
    if (!currentLayer) return;

    const minZ = Math.min(...layers.map(l => l.zIndex));
    if (currentLayer.zIndex <= minZ) return;

    onLayersChange(
      layers.map(layer => {
        if (layer.id === selectedLayerId) {
          return { ...layer, zIndex: layer.zIndex - 1 };
        }
        if (layer.zIndex === currentLayer.zIndex - 1) {
          return { ...layer, zIndex: layer.zIndex + 1 };
        }
        return layer;
      })
    );
  };

  const handleTouchStart = (e: React.TouchEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    setSelectedLayerId(layerId);

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setInitialLayerPos({ x: layer.transform.x || 0, y: layer.transform.y || 0 });

      // Check for double-tap
      const now = Date.now();
      if (now - lastTap < 300) {
        setShowQuickMenu(true);
      }
      setLastTap(now);

      // Long press for context menu (only if not moving)
      const timer = setTimeout(() => {
        if (!isDragging) {
          setShowQuickMenu(true);
        }
      }, 500);
      setLongPressTimer(timer);
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      setInitialPinchDistance(distance);
      setInitialScale(layer.transform.scale || 1);
      setIsPinching(true);
      setIsDragging(false);
      setShowScaleIndicator(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    setSelectedLayerId(layerId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialLayerPos({ x: layer.transform.x || 0, y: layer.transform.y || 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedLayerId) return;
    
    e.preventDefault();
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only start dragging if moved beyond threshold
      if (!isDragging && distance > dragThreshold) {
        setIsDragging(true);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
      }

      if (isDragging) {
        const newX = initialLayerPos.x + deltaX;
        const newY = initialLayerPos.y + deltaY;

        updateSelectedLayer({ x: newX, y: newY });
      }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (e.touches.length === 1 && selectedLayerId) {
      const touch = e.touches[0];
      const layer = layers.find(l => l.id === selectedLayerId);
      if (!layer) return;

      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only start dragging if moved beyond threshold
      if (!isDragging && distance > dragThreshold) {
        setIsDragging(true);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
      }

      if (isDragging) {
        const newX = initialLayerPos.x + deltaX;
        const newY = initialLayerPos.y + deltaY;

        // Show trash zone
        setShowTrashZone(true);

        // Calculate snap guides
        if (showSnapGuides) {
          const canvasCenter = { x: 400, y: 300 };
          const snapThreshold = 10;
          const newSnapLines: { x?: number; y?: number } = {};

          if (Math.abs(newX - canvasCenter.x) < snapThreshold) {
            newSnapLines.x = canvasCenter.x;
          }
          if (Math.abs(newY - canvasCenter.y) < snapThreshold) {
            newSnapLines.y = canvasCenter.y;
          }

          setSnapLines(newSnapLines);
        }

        updateSelectedLayer({ x: newX, y: newY });
      }
    } else if (e.touches.length === 2 && isPinching && selectedLayerId) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const scaleFactor = currentDistance / initialPinchDistance;
      const newScale = Math.max(0.1, Math.min(3, initialScale * scaleFactor));

      updateSelectedLayer({ scale: newScale });
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    setIsDragging(false);
    setIsPinching(false);
    setShowTrashZone(false);
    setSnapLines({});
    setShowScaleIndicator(false);
    setShowRotateIndicator(false);
  };

  const getBackgroundStyle = () => {
    switch (background.type) {
      case 'solid':
        return { backgroundColor: background.value };
      case 'gradient':
        return { backgroundImage: background.value };
      case 'pattern':
      case 'image':
        return { backgroundImage: `url(${background.value})` };
      default:
        return { backgroundColor: '#f5f5f5' };
    }
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={canvasRef}
        className="relative w-full aspect-[3/4] overflow-hidden rounded-lg border border-border"
        style={{
          ...getBackgroundStyle(),
          touchAction: 'manipulation',
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Snap guides */}
        {showSnapGuides && (
          <>
            {snapLines.x !== undefined && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary/70 pointer-events-none z-50 shadow-lg"
                style={{ left: `${snapLines.x}px` }}
              />
            )}
            {snapLines.y !== undefined && (
              <div
                className="absolute left-0 right-0 h-1 bg-primary/70 pointer-events-none z-50 shadow-lg"
                style={{ top: `${snapLines.y}px` }}
              />
            )}
          </>
        )}

        {/* Scale indicator */}
        {showScaleIndicator && selectedLayer && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium z-50 pointer-events-none">
            {Math.round((selectedLayer.transform.scale || 1) * 100)}%
          </div>
        )}

        {/* Rotation indicator */}
        {showRotateIndicator && selectedLayer && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium z-50 pointer-events-none">
            {Math.round(selectedLayer.transform.rotation || 0)}°
          </div>
        )}

        {/* Trash zone */}
        {showTrashZone && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-destructive/20 border-t-2 border-destructive flex items-center justify-center pointer-events-none z-50">
            <div className="text-destructive text-sm font-medium">Drop here to delete</div>
          </div>
        )}

        {/* Render layers */}
        {layers
          .filter(layer => layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => (
            <div
              key={layer.id}
              className={`absolute select-none ${selectedLayerId === layer.id ? 'ring-2 ring-primary' : ''}`}
              style={{
                left: `${layer.transform.x || 0}px`,
                top: `${layer.transform.y || 0}px`,
                transform: `scale(${layer.transform.scale || 1}) rotate(${layer.transform.rotation || 0}deg) scaleX(${layer.flipH ? -1 : 1})`,
                transformOrigin: 'center',
                opacity: layer.opacity || 1,
                zIndex: layer.zIndex,
                touchAction: 'none',
                cursor: isDragging && selectedLayerId === layer.id ? 'grabbing' : 'grab',
              }}
              onTouchStart={(e) => handleTouchStart(e, layer.id)}
              onMouseDown={(e) => handleMouseDown(e, layer.id)}
            >
              <img
                src={layer.wardrobeItem.image_bg_removed_url || layer.wardrobeItem.image_url}
                alt={layer.wardrobeItem.category}
                className="max-w-full max-h-full object-contain pointer-events-none select-none"
                draggable={false}
              />
            </div>
          ))}
      </div>

      {/* Quick Menu */}
      {showQuickMenu && selectedLayer && (
        <div className="absolute top-4 right-4 bg-background border rounded-lg shadow-lg p-2 space-y-2 z-50">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFlipH}
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-4 h-4" />
          </Button>
          <div className="space-y-1 px-2">
            <Label className="text-xs">Opacity</Label>
            <Slider
              value={[(selectedLayer.opacity || 1) * 100]}
              onValueChange={handleOpacity}
              max={100}
              step={1}
              className="w-32"
            />
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Transform Controls - Horizontal Scrollable on Mobile */}
      {selectedLayerId && selectedLayer && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-full shadow-lg p-2 z-50 ${
          isMobile 
            ? 'flex overflow-x-auto max-w-[90vw] gap-1 scrollbar-hide' 
            : 'flex items-center gap-1'
        }`}>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleRotate(-15)}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Rotate Left"
          >
            <RotateCw className="w-4 h-4 transform scale-x-[-1]" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleRotate(15)}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Rotate Right"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleScale(-0.1)}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleScale(0.1)}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleToggleVisibility}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title={selectedLayer.visible ? "Hide" : "Show"}
          >
            {selectedLayer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleBringForward}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Bring Forward"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleSendBackward}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Send Backward"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleFlipH}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleDuplicate}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            onClick={handleDelete}
            className="min-w-[44px] min-h-[44px] shrink-0 rounded-full"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
