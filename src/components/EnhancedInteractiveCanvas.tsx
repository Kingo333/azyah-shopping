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
import { toast } from 'sonner';
import { STAGE_W, STAGE_H } from '@/utils/canvasLayout';
import { measurePngTrim, type ImageMetrics } from '@/utils/measurePngTrim';
import { toCSSTransform } from '@/utils/transformMatrix';

// Fixed logical stage dimensions (9:16 aspect ratio for Instagram)
const STAGE_WIDTH = 1080;
const STAGE_HEIGHT = 1920;

export interface CanvasLayer {
  id: string;
  wardrobeItem: WardrobeItem;
  transform: {
    x: number; // Scene space (0-1080)
    y: number; // Scene space (0-1920)
    width: number; // Rendered width in scene space
    height: number; // Rendered height in scene space
    scale: number; // User scale multiplier
    rotation: number; // Degrees
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
  selectedLayerId?: string | null;
  onSelectedLayerIdChange?: (id: string | null) => void;
}

export const EnhancedInteractiveCanvas: React.FC<EnhancedInteractiveCanvasProps> = ({
  layers,
  onLayersChange,
  background,
  selectedLayerId: externalSelectedLayerId,
  onSelectedLayerIdChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [internalSelectedLayerId, setInternalSelectedLayerId] = useState<string | null>(null);
  
  const selectedLayerId = externalSelectedLayerId !== undefined ? externalSelectedLayerId : internalSelectedLayerId;
  const setSelectedLayerId = onSelectedLayerIdChange || setInternalSelectedLayerId;
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
  const [showScaleIndicator, setShowScaleIndicator] = useState(false);
  const [showRotateIndicator, setShowRotateIndicator] = useState(false);
  const [metricsCache, setMetricsCache] = useState<Map<string, ImageMetrics>>(new Map());
  const dragThreshold = 2;
  // Canvas is now fully responsive - no need for scaling logic

  // Preload metrics when layers change
  useEffect(() => {
    const loadMetrics = async () => {
      const cache = new Map<string, ImageMetrics>();
      
      await Promise.all(
        layers.map(async (layer) => {
          const imageUrl = layer.wardrobeItem.image_bg_removed_url || layer.wardrobeItem.image_url;
          try {
            const metrics = await measurePngTrim(imageUrl);
            cache.set(layer.id, metrics);
          } catch (error) {
            console.error(`Failed to measure layer ${layer.id}:`, error);
            // Fallback to basic metrics
            cache.set(layer.id, {
              naturalWidth: 1000,
              naturalHeight: 1000,
              trim: { left: 0, right: 0, top: 0, bottom: 0 },
            });
          }
        })
      );
      
      setMetricsCache(cache);
    };
    
    loadMetrics();
  }, [layers]);

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
    
    // Phase 5: Clamp positions to safe area
    const clampedUpdates = { ...updates } as any;
    if ('x' in clampedUpdates) {
      const newX = clampedUpdates.x;
      clampedUpdates.x = Math.max(0, Math.min(STAGE_WIDTH, newX));
      
      // Warn if near edges
      if (newX < 50 || newX > STAGE_WIDTH - 50) {
        toast.warning('Item near edge', {
          description: 'Item may be cropped in export'
        });
      }
    }
    if ('y' in clampedUpdates) {
      const newY = clampedUpdates.y;
      clampedUpdates.y = Math.max(0, Math.min(STAGE_HEIGHT, newY));
      
      // Warn if near edges
      if (newY < 50 || newY > STAGE_HEIGHT - 50) {
        toast.warning('Item near edge', {
          description: 'Item may be cropped in export'
        });
      }
    }
    
    onLayersChange(
      layers.map(layer =>
        layer.id === selectedLayerId
          ? {
              ...layer,
              transform: { ...layer.transform, ...clampedUpdates },
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
    const newScale = Math.max(0.1, Math.min(4, (selectedLayer.transform.scale || 1) + delta));
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

  // Convert client coordinates to canvas coordinates (now percentage-based)
  const clientToCanvasCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    // Convert to percentage within canvas
    const xPercent = ((clientX - rect.left) / rect.width) * STAGE_WIDTH;
    const yPercent = ((clientY - rect.top) / rect.height) * STAGE_HEIGHT;
    return { x: xPercent, y: yPercent };
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

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * STAGE_WIDTH;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * STAGE_HEIGHT;
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

      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const deltaX = ((touch.clientX - dragStart.x) / rect.width) * STAGE_WIDTH;
      const deltaY = ((touch.clientY - dragStart.y) / rect.height) * STAGE_HEIGHT;
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

        // Calculate snap guides (in stage coordinates)
        if (showSnapGuides) {
          const stageCenter = { 
            x: STAGE_WIDTH / 2, 
            y: STAGE_HEIGHT / 2 
          };
          const snapThreshold = 40; // Fixed pixel threshold
          const newSnapLines: { x?: number; y?: number } = {};

          if (Math.abs(newX - stageCenter.x) < snapThreshold) {
            newSnapLines.x = stageCenter.x;
          }
          if (Math.abs(newY - stageCenter.y) < snapThreshold) {
            newSnapLines.y = stageCenter.y;
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
      const newScale = Math.max(0.1, Math.min(4, initialScale * scaleFactor));

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
    <div 
      ref={wrapperRef}
      className="relative w-full h-full"
      style={{
        aspectRatio: '9/16',
        maxWidth: '100%',
        maxHeight: isMobile ? '90dvh' : 'calc(100vh - 8rem)',
        margin: 'auto',
      }}
    >
      <div
        ref={canvasRef}
        className="w-full h-full rounded-lg border border-border relative"
        style={{
          maxHeight: '100%',
          ...getBackgroundStyle(),
          touchAction: isDragging ? 'none' : 'manipulation',
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Phase 4: 9:16 Safe Area Overlay - Hidden during export */}
        <div 
          className="ui-only absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ zIndex: 0 }}
        >
          <div 
            className="relative border-2 border-dashed border-primary/40 rounded-lg"
            style={{
              aspectRatio: '9/16',
              width: 'auto',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            {/* Corner markers for better visibility */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/60" />
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary/60" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary/60" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/60" />
            
            {/* Label */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-primary font-medium">
              9:16 Safe Area
            </div>
          </div>
        </div>

        {/* Phase 4: Snap guides - Hidden during export */}
        {showSnapGuides && (
          <div className="ui-only">
            {snapLines.x !== undefined && (
              <div
                className="absolute top-0 w-px bg-primary/70 pointer-events-none z-50 shadow-lg"
                style={{ 
                  left: `${snapLines.x}px`,
                  height: `${STAGE_HEIGHT}px`
                }}
              />
            )}
            {snapLines.y !== undefined && (
              <div
                className="absolute left-0 h-px bg-primary/70 pointer-events-none z-50 shadow-lg"
                style={{ 
                  top: `${snapLines.y}px`,
                  width: `${STAGE_WIDTH}px`
                }}
              />
            )}
          </div>
        )}

        {/* Phase 4: Scale indicator - Hidden during export */}
        {showScaleIndicator && selectedLayer && (
          <div className="ui-only absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium z-50 pointer-events-none">
            {Math.round((selectedLayer.transform.scale || 1) * 100)}%
          </div>
        )}

        {/* Phase 4: Rotation indicator - Hidden during export */}
        {showRotateIndicator && selectedLayer && (
          <div className="ui-only absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium z-50 pointer-events-none">
            {Math.round(selectedLayer.transform.rotation || 0)}°
          </div>
        )}

        {/* Render layers */}
        {layers
          .filter(layer => layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => {
            const metrics = metricsCache.get(layer.id);
            
            if (!metrics) return null; // Skip until metrics loaded
            
            // Use unified transform calculation (SAME as export)
            const cssProps = toCSSTransform(
              {
                x: layer.transform.x,
                y: layer.transform.y,
                scale: layer.transform.scale,
                rotation: layer.transform.rotation,
                flipH: layer.flipH,
              },
              metrics
            );
            
            return (
              <div
                key={layer.id}
                className={`absolute select-none ${selectedLayerId === layer.id ? 'outline outline-2 outline-primary outline-offset-2' : ''}`}
                style={{
                  left: cssProps.left,
                  top: cssProps.top,
                  width: cssProps.width,
                  height: cssProps.height,
                  transform: cssProps.transform,
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
                  className="w-full h-full object-contain pointer-events-none select-none"
                  draggable={false}
                />
              </div>
            );
          })}
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
        <div className={`absolute left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-full shadow-lg p-1.5 z-50 flex items-center gap-0.5 ${
          isMobile ? 'bottom-16 max-w-[95vw]' : 'bottom-4'
        }`}>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleRotate(-15)}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Rotate Left"
          >
            <RotateCw className="w-3 h-3 transform scale-x-[-1]" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleRotate(15)}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Rotate Right"
          >
            <RotateCw className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleScale(-0.1)}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleScale(0.1)}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleToggleVisibility}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title={selectedLayer.visible ? "Hide" : "Show"}
          >
            {selectedLayer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleBringForward}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Bring Forward"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleSendBackward}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Send Backward"
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleFlipH}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleDuplicate}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            onClick={handleDelete}
            className="w-7 h-7 shrink-0 rounded-full p-0"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
