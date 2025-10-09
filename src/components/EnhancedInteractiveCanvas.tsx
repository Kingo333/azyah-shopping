import React, { useRef, useState, useEffect } from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  RotateCw, ZoomIn, ZoomOut, Trash2, Copy, 
  Eye, EyeOff, ArrowUp, ArrowDown, FlipHorizontal
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

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
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const [lastTap, setLastTap] = useState(0);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleLayerSelect = (layerId: string) => {
    setSelectedLayerId(layerId);
  };

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent, layerId: string) => {
    e.preventDefault();
    setSelectedLayerId(layerId);

    // Double tap detection
    const now = Date.now();
    if (now - lastTap < 300) {
      setShowQuickMenu(true);
      setLastTap(0);
      return;
    }
    setLastTap(now);

    // Long press detection
    const timer = setTimeout(() => {
      setShowQuickMenu(true);
    }, 500);
    setLongPressTimer(timer);

    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && selectedLayerId === layerId) {
      // Pinch to scale
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setIsPinching(true);
      setInitialPinchDistance(distance);
      const layer = layers.find(l => l.id === layerId);
      if (layer) setInitialScale(layer.transform.scale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!selectedLayerId) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;

      onLayersChange(
        layers.map(layer =>
          layer.id === selectedLayerId
            ? {
                ...layer,
                transform: {
                  ...layer.transform,
                  x: layer.transform.x + dx,
                  y: layer.transform.y + dy,
                },
              }
            : layer
        )
      );

      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && isPinching) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = initialScale * (distance / initialPinchDistance);
      
      updateSelectedLayer({
        transform: {
          ...selectedLayer!.transform,
          scale: Math.max(0.1, Math.min(3, scale)),
        },
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPinching(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const updateSelectedLayer = (updates: Partial<CanvasLayer>) => {
    if (!selectedLayerId) return;
    onLayersChange(
      layers.map(layer =>
        layer.id === selectedLayerId ? { ...layer, ...updates } : layer
      )
    );
  };

  const handleRotate = (degrees: number) => {
    if (!selectedLayer) return;
    let newRotation = (selectedLayer.transform.rotation + degrees) % 360;
    
    // Snap to 0° within ±5°
    if (Math.abs(newRotation) < 5 || Math.abs(newRotation - 360) < 5) {
      newRotation = 0;
    }
    
    updateSelectedLayer({
      transform: {
        ...selectedLayer.transform,
        rotation: newRotation,
      },
    });
  };

  const handleScale = (delta: number) => {
    if (!selectedLayer) return;
    updateSelectedLayer({
      transform: {
        ...selectedLayer.transform,
        scale: Math.max(0.1, Math.min(3, selectedLayer.transform.scale + delta)),
      },
    });
  };

  const handleFlipH = () => {
    if (!selectedLayer) return;
    updateSelectedLayer({ flipH: !selectedLayer.flipH });
  };

  const handleOpacity = (value: number[]) => {
    if (!selectedLayer) return;
    updateSelectedLayer({ opacity: value[0] });
  };

  const handleDelete = () => {
    if (!selectedLayerId) return;
    onLayersChange(layers.filter(l => l.id !== selectedLayerId));
    setSelectedLayerId(null);
    setShowQuickMenu(false);
  };

  const handleDuplicate = () => {
    if (!selectedLayer) return;
    const newLayer: CanvasLayer = {
      ...selectedLayer,
      id: `${selectedLayer.id}-copy-${Date.now()}`,
      transform: {
        ...selectedLayer.transform,
        x: selectedLayer.transform.x + 20,
        y: selectedLayer.transform.y + 20,
      },
      zIndex: layers.length,
    };
    onLayersChange([...layers, newLayer]);
    setShowQuickMenu(false);
  };

  const handleToggleVisibility = () => {
    if (!selectedLayerId) return;
    updateSelectedLayer({ visible: !selectedLayer?.visible });
  };

  const handleBringForward = () => {
    if (!selectedLayerId) return;
    const maxZ = Math.max(...layers.map(l => l.zIndex));
    updateSelectedLayer({ zIndex: maxZ + 1 });
    setShowQuickMenu(false);
  };

  const handleSendBackward = () => {
    if (!selectedLayerId) return;
    const minZ = Math.min(...layers.map(l => l.zIndex));
    updateSelectedLayer({ zIndex: Math.max(0, minZ - 1) });
    setShowQuickMenu(false);
  };

  const getBackgroundStyle = () => {
    switch (background.type) {
      case 'solid':
        return { backgroundColor: background.value };
      case 'gradient':
        return { backgroundImage: background.value };
      case 'pattern':
        return { backgroundImage: `url(${background.value})`, backgroundSize: 'repeat' };
      case 'image':
        return { backgroundImage: `url(${background.value})`, backgroundSize: 'cover' };
      default:
        return { backgroundColor: 'hsl(var(--muted))' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-border shadow-lg touch-none"
        style={getBackgroundStyle()}
        onTouchEnd={handleTouchEnd}
      >
        {layers
          .filter(layer => layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(layer => (
            <div
              key={layer.id}
              className={`absolute cursor-move transition-shadow select-none ${
                selectedLayerId === layer.id ? 'ring-2 ring-primary shadow-2xl' : ''
              }`}
              style={{
                transform: `translate(${layer.transform.x}px, ${layer.transform.y}px) rotate(${layer.transform.rotation}deg) scale(${layer.transform.scale}) scaleX(${layer.flipH ? -1 : 1})`,
                transformOrigin: 'center',
                zIndex: layer.zIndex,
                left: '50%',
                top: '50%',
                marginLeft: '-50px',
                marginTop: '-50px',
                opacity: layer.opacity,
              }}
              onTouchStart={(e) => handleTouchStart(e, layer.id)}
              onTouchMove={handleTouchMove}
            >
              <img
                src={layer.wardrobeItem.image_bg_removed_url || layer.wardrobeItem.image_url}
                alt={layer.wardrobeItem.category}
                className="w-auto h-auto max-w-[200px] max-h-[200px] object-contain pointer-events-none drop-shadow-lg"
                draggable={false}
              />
            </div>
          ))}

        {layers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-muted-foreground">Empty Canvas</p>
              <p className="text-sm text-muted-foreground">
                Tap items below to add them to your fit
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Menu (Double-tap / Long-press) */}
      {showQuickMenu && selectedLayer && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center" onClick={() => setShowQuickMenu(false)}>
          <div className="bg-card border rounded-lg p-4 space-y-3 m-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium">Quick Actions</h3>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Opacity</Label>
                <Slider
                  value={[selectedLayer.opacity]}
                  onValueChange={handleOpacity}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={handleFlipH}>
                  <FlipHorizontal className="w-4 h-4 mr-1" />
                  Flip
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transform Controls */}
      {selectedLayer && (
        <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRotate(-15)}
            title="Rotate Left"
          >
            <RotateCw className="w-4 h-4 scale-x-[-1]" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRotate(15)}
            title="Rotate Right"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleScale(0.1)}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleScale(-0.1)}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleVisibility}
            title="Toggle Visibility"
          >
            {selectedLayer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBringForward}
            title="Bring Forward"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendBackward}
            title="Send Backward"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicate}
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </Button>
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
    </div>
  );
};
