import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Search, Loader2, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CropRect,
  clampCropRect,
  cropRectToPixels,
} from '@/utils/imageCropUtils';
import {
  DetectedBox,
  detectProductRegions,
  findBoxAtPoint,
  boxToCropRect,
  createBoxAroundPoint,
} from '@/utils/objectDetection';

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
  
  // Auto-detection state
  const [isDetecting, setIsDetecting] = useState(true);
  const [candidateBoxes, setCandidateBoxes] = useState<DetectedBox[]>([]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(0);
  
  // Drag state (for manual adjustment)
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<CropRect | null>(null);
  const [manualRect, setManualRect] = useState<CropRect | null>(null);

  // Get current crop rect (manual override or selected box)
  const cropRect = manualRect || (candidateBoxes[selectedBoxIndex] 
    ? boxToCropRect(candidateBoxes[selectedBoxIndex]) 
    : { x: 0.1, y: 0.1, width: 0.8, height: 0.8 });

  // Load image and run auto-detection
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = async () => {
      setImageDimensions({ width: img.width, height: img.height });
      
      // Calculate display size (fit within container)
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const containerHeight = 320;
        
        const scale = Math.min(
          containerWidth / img.width,
          containerHeight / img.height
        );
        
        setDisplayDimensions({
          width: img.width * scale,
          height: img.height * scale,
        });
      }
      
      // Run auto-detection
      setIsDetecting(true);
      try {
        const boxes = await detectProductRegions(imageUrl);
        setCandidateBoxes(boxes);
        setSelectedBoxIndex(0); // Select first (best) box
      } catch (err) {
        console.error('Detection failed:', err);
        // Use fallback
        setCandidateBoxes([{
          x: 0.1, y: 0.1, width: 0.8, height: 0.8,
          label: 'product', score: 0.5
        }]);
      }
      setIsDetecting(false);
    };
  }, [imageUrl]);

  // Handle tap on image - switch to box at tap point
  const handleImageTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isProcessing || isDragging || isResizing) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Convert to relative coordinates
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    
    // Find box at tap point
    const tappedBox = findBoxAtPoint(candidateBoxes, relX, relY);
    
    if (tappedBox) {
      const index = candidateBoxes.indexOf(tappedBox);
      if (index !== -1 && index !== selectedBoxIndex) {
        setSelectedBoxIndex(index);
        setManualRect(null); // Reset manual override
      }
    } else {
      // Create new box around tap point
      const newBox = createBoxAroundPoint(relX, relY, 0.35);
      setCandidateBoxes(prev => [...prev, newBox]);
      setSelectedBoxIndex(candidateBoxes.length);
      setManualRect(null);
    }
  }, [candidateBoxes, selectedBoxIndex, isProcessing, isDragging, isResizing]);

  // Mouse/touch handlers for dragging the crop box
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isProcessing) return;
    e.stopPropagation();
    
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
    
    setManualRect(newRect);
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
    
    setManualRect(newRect);
  }, [isResizing, dragStart, displayDimensions, initialRect]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    onConfirm([
      { type: 'garment', rect: cropRect },
    ]);
  }, [cropRect, onConfirm]);

  // Calculate pixel positions for overlays
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
            <div 
              className="relative" 
              style={{ width: displayDimensions.width, height: displayDimensions.height }}
              onClick={handleImageTap}
            >
              <img
                src={imageUrl}
                alt="Product to search"
                className="w-full h-full object-cover rounded-lg"
                draggable={false}
              />
              
              {/* Detection loading overlay */}
              {isDetecting && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-2 text-white bg-black/50 px-3 py-1.5 rounded-full">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Detecting...</span>
                  </div>
                </div>
              )}
              
              {/* Darkened overlay outside crop */}
              {!isDetecting && (
                <div className="absolute inset-0 pointer-events-none">
                  <div 
                    className="absolute left-0 right-0 top-0 bg-black/50"
                    style={{ height: cropPixels.y }}
                  />
                  <div 
                    className="absolute left-0 right-0 bottom-0 bg-black/50"
                    style={{ height: displayDimensions.height - cropPixels.y - cropPixels.height }}
                  />
                  <div 
                    className="absolute left-0 bg-black/50"
                    style={{ 
                      top: cropPixels.y, 
                      width: cropPixels.x,
                      height: cropPixels.height 
                    }}
                  />
                  <div 
                    className="absolute right-0 bg-black/50"
                    style={{ 
                      top: cropPixels.y, 
                      width: displayDimensions.width - cropPixels.x - cropPixels.width,
                      height: cropPixels.height 
                    }}
                  />
                </div>
              )}
              
              {/* Other candidate boxes (subtle indicators with labels) */}
              {!isDetecting && candidateBoxes.map((box, idx) => {
                if (idx === selectedBoxIndex) return null;
                const boxPixels = cropRectToPixels(boxToCropRect(box), displayDimensions.width, displayDimensions.height);
                return (
                  <div
                    key={idx}
                    className="absolute border border-dashed border-white/40 rounded pointer-events-none"
                    style={{
                      left: boxPixels.x,
                      top: boxPixels.y,
                      width: boxPixels.width,
                      height: boxPixels.height,
                    }}
                  >
                    {/* Label badge */}
                    <div className="absolute -top-5 left-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {box.label}
                    </div>
                  </div>
                );
              })}
              
              {/* Active crop box */}
              {!isDetecting && (
                <div
                  className={cn(
                    "absolute border-2 border-primary rounded cursor-move shadow-lg",
                    isDragging && "cursor-grabbing"
                  )}
                  style={{
                    left: cropPixels.x,
                    top: cropPixels.y,
                    width: cropPixels.width,
                    height: cropPixels.height,
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Label badge */}
                  {candidateBoxes[selectedBoxIndex] && (
                    <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded font-medium">
                      {candidateBoxes[selectedBoxIndex].label}
                      {candidateBoxes[selectedBoxIndex].description && (
                        <span className="ml-1 opacity-80">
                          – {candidateBoxes[selectedBoxIndex].description.substring(0, 20)}
                        </span>
                      )}
                    </div>
                  )}
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-2 h-2 border-r border-b border-muted-foreground/50" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help text */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
        <Hand className="h-3.5 w-3.5" />
        <span>Tap to select another item • Drag to adjust</span>
      </div>

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
          disabled={isProcessing || isDetecting}
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
