import React, { useRef, useEffect, useState } from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { Button } from '@/components/ui/button';
import { 
  Move, RotateCw, ZoomIn, ZoomOut, Trash2, Copy, 
  Eye, EyeOff, ArrowUp, ArrowDown 
} from 'lucide-react';

export interface CanvasLayer {
  id: string;
  wardrobeItem: WardrobeItem;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  visible: boolean;
  zIndex: number;
}

interface InteractiveCanvasProps {
  layers: CanvasLayer[];
  onLayersChange: (layers: CanvasLayer[]) => void;
  background: {
    type: 'solid' | 'gradient' | 'pattern' | 'image';
    value: string;
  };
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  layers,
  onLayersChange,
  background,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleLayerSelect = (layerId: string) => {
    setSelectedLayerId(layerId);
  };

  const handleMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setSelectedLayerId(layerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedLayerId) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

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

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
    updateSelectedLayer({
      transform: {
        ...selectedLayer.transform,
        rotation: (selectedLayer.transform.rotation + degrees) % 360,
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

  const handleDelete = () => {
    if (!selectedLayerId) return;
    onLayersChange(layers.filter(l => l.id !== selectedLayerId));
    setSelectedLayerId(null);
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
  };

  const handleToggleVisibility = () => {
    if (!selectedLayerId) return;
    updateSelectedLayer({ visible: !selectedLayer?.visible });
  };

  const handleBringForward = () => {
    if (!selectedLayerId) return;
    const maxZ = Math.max(...layers.map(l => l.zIndex));
    updateSelectedLayer({ zIndex: maxZ + 1 });
  };

  const handleSendBackward = () => {
    if (!selectedLayerId) return;
    const minZ = Math.min(...layers.map(l => l.zIndex));
    updateSelectedLayer({ zIndex: Math.max(0, minZ - 1) });
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
        return { backgroundColor: '#f5f5f5' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-border shadow-lg"
        style={getBackgroundStyle()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {layers
          .filter(layer => layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(layer => (
            <div
              key={layer.id}
              className={`absolute cursor-move transition-shadow ${
                selectedLayerId === layer.id ? 'ring-2 ring-primary shadow-2xl' : ''
              }`}
              style={{
                transform: `translate(${layer.transform.x}px, ${layer.transform.y}px) rotate(${layer.transform.rotation}deg) scale(${layer.transform.scale})`,
                transformOrigin: 'center',
                zIndex: layer.zIndex,
                left: '50%',
                top: '50%',
                marginLeft: '-50px',
                marginTop: '-50px',
              }}
              onMouseDown={(e) => handleMouseDown(e, layer.id)}
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
