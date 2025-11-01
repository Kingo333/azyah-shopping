/**
 * Normalized Interactive Canvas
 * Uses normalized 0-1 coordinates for pixel-perfect rendering
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { CanvasScene, NormalizedCanvasItem } from '@/types/canvas';
import { screenToNormalized, screenDeltaToNormalized, clampToSafeArea, snapToGrid } from '@/utils/canvasCoordinates';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  RotateCw, ZoomIn, ZoomOut, Trash2, Copy,
  Eye, EyeOff, ArrowUp, ArrowDown, FlipHorizontal
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NormalizedCanvasProps {
  scene: CanvasScene;
  onSceneChange: (scene: CanvasScene) => void;
  selectedItemId?: string | null;
  onSelectedItemIdChange?: (id: string | null) => void;
}

export const NormalizedCanvas: React.FC<NormalizedCanvasProps> = ({
  scene,
  onSceneChange,
  selectedItemId: externalSelectedItemId,
  onSelectedItemIdChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [internalSelectedItemId, setInternalSelectedItemId] = useState<string | null>(null);
  const selectedItemId = externalSelectedItemId !== undefined ? externalSelectedItemId : internalSelectedItemId;
  const setSelectedItemId = onSelectedItemIdChange || setInternalSelectedItemId;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialItemPos, setInitialItemPos] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const selectedItem = scene.items.find(item => item.id === selectedItemId);

  const updateItem = useCallback((itemId: string, updates: Partial<NormalizedCanvasItem>) => {
    onSceneChange({
      ...scene,
      items: scene.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  }, [scene, onSceneChange]);

  // Mouse/Touch handlers
  const handlePointerDown = (e: React.PointerEvent, item: NormalizedCanvasItem) => {
    e.stopPropagation();
    setSelectedItemId(item.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialItemPos({ x: item.x, y: item.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !selectedItemId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const { dx, dy } = screenDeltaToNormalized(
      e.clientX - dragStart.x,
      e.clientY - dragStart.y,
      rect
    );

    const item = scene.items.find(i => i.id === selectedItemId);
    if (!item) return;

    const newX = initialItemPos.x + dx;
    const newY = initialItemPos.y + dy;

    // Clamp to safe area
    const { x, y } = clampToSafeArea(newX, newY, item.w, item.h);

    updateItem(selectedItemId, { x, y });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Actions
  const handleDelete = () => {
    if (!selectedItemId) return;
    onSceneChange({
      ...scene,
      items: scene.items.filter(item => item.id !== selectedItemId),
    });
    setSelectedItemId(null);
  };

  const handleDuplicate = () => {
    if (!selectedItem) return;
    const newItem: NormalizedCanvasItem = {
      ...selectedItem,
      id: `item-${Date.now()}`,
      x: selectedItem.x + 0.05,
      y: selectedItem.y + 0.05,
      z: scene.items.length,
    };
    onSceneChange({
      ...scene,
      items: [...scene.items, newItem],
    });
    setSelectedItemId(newItem.id);
  };

  const handleFlipH = () => {
    if (!selectedItemId) return;
    updateItem(selectedItemId, {
      scaleX: selectedItem?.scaleX === 1 ? -1 : 1,
      flipX: !selectedItem?.flipX,
    });
  };

  const handleBringForward = () => {
    if (!selectedItemId) return;
    const sorted = [...scene.items].sort((a, b) => a.z - b.z);
    const index = sorted.findIndex(item => item.id === selectedItemId);
    if (index < sorted.length - 1) {
      const newItems = [...scene.items];
      newItems.forEach(item => {
        if (item.id === selectedItemId) item.z++;
        else if (item.z === sorted[index + 1].z) item.z--;
      });
      onSceneChange({ ...scene, items: newItems });
    }
  };

  const handleSendBackward = () => {
    if (!selectedItemId) return;
    const sorted = [...scene.items].sort((a, b) => a.z - b.z);
    const index = sorted.findIndex(item => item.id === selectedItemId);
    if (index > 0) {
      const newItems = [...scene.items];
      newItems.forEach(item => {
        if (item.id === selectedItemId) item.z--;
        else if (item.z === sorted[index - 1].z) item.z++;
      });
      onSceneChange({ ...scene, items: newItems });
    }
  };

  // Render background
  const getBackgroundStyle = () => {
    if (scene.background.type === 'solid') {
      return { backgroundColor: scene.background.value };
    } else if (scene.background.type === 'gradient') {
      return { background: scene.background.value };
    }
    return { backgroundColor: '#FFFFFF' };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Canvas Container */}
      <div
        ref={canvasRef}
        className="relative w-full h-full max-h-full"
        style={{
          aspectRatio: '9/16',
          maxWidth: 'min(100%, calc(100vh * 9 / 16))',
          ...getBackgroundStyle(),
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => setSelectedItemId(null)}
      >
        {/* Render items */}
        {scene.items
          .filter(item => item.visible)
          .sort((a, b) => a.z - b.z)
          .map(item => (
            <div
              key={item.id}
              className={`absolute cursor-move ${selectedItemId === item.id ? 'ring-2 ring-primary' : ''}`}
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                width: `${item.w * 100}%`,
                height: `${item.h * 100}%`,
                transform: `
                  translate(-50%, -50%)
                  rotate(${item.rotation}deg)
                  scaleX(${item.scaleX})
                  scaleY(${item.scaleY})
                `,
                opacity: item.opacity,
                zIndex: item.z,
                pointerEvents: item.locked ? 'none' : 'auto',
              }}
              onPointerDown={(e) => handlePointerDown(e, item)}
            >
              <img
                src={item.src}
                alt="outfit item"
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />
            </div>
          ))}

        {/* Quick Menu for Selected Item */}
        {selectedItem && !isMobile && (
          <div className="absolute top-2 right-2 bg-background/95 backdrop-blur-sm border rounded-lg p-2 flex gap-1 z-50">
            <Button size="icon" variant="ghost" onClick={handleFlipH} title="Flip Horizontal">
              <FlipHorizontal className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleBringForward} title="Bring Forward">
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleSendBackward} title="Send Backward">
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDuplicate} title="Duplicate">
              <Copy className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDelete} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Opacity & Rotation Controls */}
        {selectedItem && !isMobile && (
          <div className="absolute bottom-2 left-2 right-2 bg-background/95 backdrop-blur-sm border rounded-lg p-3 z-50">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Opacity</label>
                <Slider
                  value={[selectedItem.opacity * 100]}
                  onValueChange={([value]) => updateItem(selectedItemId!, { opacity: value / 100 })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Rotation</label>
                <Slider
                  value={[selectedItem.rotation]}
                  onValueChange={([value]) => updateItem(selectedItemId!, { rotation: value })}
                  min={0}
                  max={360}
                  step={1}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
