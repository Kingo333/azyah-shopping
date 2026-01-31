import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Crop, Maximize, Grid3X3, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CropRect,
  CROP_PRESETS,
  DEFAULT_CROP,
  clampCropRect,
  cropRectToPixels,
  pixelsToCropRect,
} from '@/utils/imageCropUtils';

interface ImageCropSelectorProps {
  imageUrl: string;
  onConfirm: (crops: { type: 'garment' | 'pattern' | 'full'; rect: CropRect }[]) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ImageCropSelector({
  imageUrl,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ImageCropSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_CROP);
  const [activePreset, setActivePreset] = useState<'garment' | 'pattern' | 'full'>('garment');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<CropRect | null>(null);

  // Load image and calculate display dimensions
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      
      // Calculate display size (fit within container)
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32; // Padding
        const containerHeight = 320; // Max height
        
        const scale = Math.min(
          containerWidth / img.width,
          containerHeight / img.height
        );
        
        setDisplayDimensions({
          width: img.width * scale,
          height: img.height * scale,
        });
      }
    };
  }, [imageUrl]);

  // Handle preset selection
  const handlePresetClick = useCallback((presetId: 'garment' | 'pattern' | 'full') => {
    const preset = CROP_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCropRect(preset.rect);
      setActivePreset(presetId);
    }
  }, []);

  // Mouse/touch handlers for dragging the crop box
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isProcessing) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setInitialRect(cropRect);
  }, [cropRect, isProcessing]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !initialRect) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = (clientX - dragStart.x) / displayDimensions.width;
    const deltaY = (clientY - dragStart.y) / displayDimensions.height;
    
    const newRect = clampCropRect({
      x: initialRect.x + deltaX,
      y: initialRect.y + deltaY,
      width: initialRect.width,
      height: initialRect.height,
    });
    
    setCropRect(newRect);
    setActivePreset('garment'); // Custom position
  }, [isDragging, dragStart, displayDimensions, initialRect]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setInitialRect(null);
  }, []);

  // Resize handle
  const handleResizeMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setIsResizing(true);
    setDragStart({ x: clientX, y: clientY });
    setInitialRect(cropRect);
  }, [cropRect, isProcessing]);

  const handleResizeMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing || !initialRect) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = (clientX - dragStart.x) / displayDimensions.width;
    const deltaY = (clientY - dragStart.y) / displayDimensions.height;
    
    const newRect = clampCropRect({
      x: initialRect.x,
      y: initialRect.y,
      width: Math.max(0.15, initialRect.width + deltaX),
      height: Math.max(0.15, initialRect.height + deltaY),
    });
    
    setCropRect(newRect);
    setActivePreset('garment'); // Custom size
  }, [isResizing, dragStart, displayDimensions, initialRect]);

  // Handle confirm - send garment crop only (pattern/full can be added later)
  const handleConfirm = useCallback(() => {
    onConfirm([
      { type: 'garment', rect: cropRect },
    ]);
  }, [cropRect, onConfirm]);

  // Calculate pixel positions for the crop overlay
  const cropPixels = cropRectToPixels(cropRect, displayDimensions.width, displayDimensions.height);

  return (
    <div className="space-y-4">
      {/* Image with crop overlay */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden bg-black/5"
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleResizeMove(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={(e) => {
          handleMouseMove(e);
          handleResizeMove(e);
        }}
        onTouchEnd={handleMouseUp}
      >
        {/* Image */}
        <div 
          className="flex items-center justify-center p-4"
          style={{ minHeight: '200px' }}
        >
          {displayDimensions.width > 0 && (
            <div className="relative" style={{ width: displayDimensions.width, height: displayDimensions.height }}>
              <img
                src={imageUrl}
                alt="Product to search"
                className="w-full h-full object-cover rounded-lg"
                draggable={false}
              />
              
              {/* Darkened overlay outside crop */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top dark area */}
                <div 
                  className="absolute left-0 right-0 top-0 bg-black/50"
                  style={{ height: cropPixels.y }}
                />
                {/* Bottom dark area */}
                <div 
                  className="absolute left-0 right-0 bottom-0 bg-black/50"
                  style={{ height: displayDimensions.height - cropPixels.y - cropPixels.height }}
                />
                {/* Left dark area */}
                <div 
                  className="absolute left-0 bg-black/50"
                  style={{ 
                    top: cropPixels.y, 
                    width: cropPixels.x,
                    height: cropPixels.height 
                  }}
                />
                {/* Right dark area */}
                <div 
                  className="absolute right-0 bg-black/50"
                  style={{ 
                    top: cropPixels.y, 
                    width: displayDimensions.width - cropPixels.x - cropPixels.width,
                    height: cropPixels.height 
                  }}
                />
              </div>
              
              {/* Crop box */}
              <div
                className={cn(
                  "absolute border-2 border-white rounded cursor-move",
                  "shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]",
                  isDragging && "cursor-grabbing"
                )}
                style={{
                  left: cropPixels.x,
                  top: cropPixels.y,
                  width: cropPixels.width,
                  height: cropPixels.height,
                  boxShadow: 'none', // Using overlay divs instead
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                {/* Corner brackets (Google Lens style) */}
                <div className="absolute -left-0.5 -top-0.5 w-4 h-4 border-l-2 border-t-2 border-white" />
                <div className="absolute -right-0.5 -top-0.5 w-4 h-4 border-r-2 border-t-2 border-white" />
                <div className="absolute -left-0.5 -bottom-0.5 w-4 h-4 border-l-2 border-b-2 border-white" />
                <div className="absolute -right-0.5 -bottom-0.5 w-4 h-4 border-r-2 border-b-2 border-white" />
                
                {/* Resize handle (bottom-right) */}
                <div
                  className="absolute -right-2 -bottom-2 w-5 h-5 bg-white rounded-full shadow-lg cursor-se-resize flex items-center justify-center"
                  onMouseDown={handleResizeMouseDown}
                  onTouchStart={handleResizeMouseDown}
                >
                  <div className="w-2 h-2 border-r border-b border-muted-foreground/50" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2 justify-center">
        {CROP_PRESETS.map((preset) => {
          const Icon = preset.id === 'garment' ? Crop : 
                       preset.id === 'pattern' ? Grid3X3 : 
                       Maximize;
          
          return (
            <Button
              key={preset.id}
              variant={activePreset === preset.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset.id)}
              disabled={isProcessing}
              className={cn(
                "rounded-xl gap-1.5 text-xs",
                activePreset === preset.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/50 border-white/30"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {preset.label}
            </Button>
          );
        })}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground/80 text-center">
        Drag to move • Resize from corner • Focus on the garment for best results
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 rounded-xl bg-white/50 border-white/30"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="flex-1 rounded-xl"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search Deals
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ImageCropSelector;
