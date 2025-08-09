
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RotateCcw, ZoomIn, ZoomOut, Move3D, RotateCw } from 'lucide-react';
import type { Product } from '@/types';

interface ARGarmentOverlayProps {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  isVisible: boolean;
  containerWidth: number;
  containerHeight: number;
  onOverlayChange?: (transform: GarmentTransform) => void;
}

interface GarmentTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export const ARGarmentOverlay: React.FC<ARGarmentOverlayProps> = ({
  product,
  selectedSize,
  selectedColor,
  isVisible,
  containerWidth,
  containerHeight,
  onOverlayChange
}) => {
  const [transform, setTransform] = useState<GarmentTransform>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOverlayChange?.(transform);
  }, [transform, onOverlayChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - transform.x,
      y: e.clientY - transform.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setTransform(prev => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 2) }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.3) }));
  };

  const handleRotate = () => {
    setTransform(prev => ({ ...prev, rotation: prev.rotation + 15 }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
  };

  const getGarmentDimensions = () => {
    // Base dimensions that adapt to body proportions
    const baseWidth = Math.min(containerWidth * 0.4, 200);
    const baseHeight = Math.min(containerHeight * 0.6, 300);
    
    // Adjust based on garment category
    const category = product.category_slug?.toLowerCase();
    if (category?.includes('top') || category?.includes('shirt') || category?.includes('blouse')) {
      return { width: baseWidth, height: baseHeight * 0.6 };
    } else if (category?.includes('dress')) {
      return { width: baseWidth, height: baseHeight * 1.2 };
    } else if (category?.includes('bottom') || category?.includes('pant') || category?.includes('skirt')) {
      return { width: baseWidth * 0.8, height: baseHeight * 0.7 };
    }
    return { width: baseWidth, height: baseHeight };
  };

  const { width: garmentWidth, height: garmentHeight } = getGarmentDimensions();

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Body outline guide */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
        <div className="w-32 h-48 border-2 border-dashed border-white rounded-full" />
      </div>

      {/* Garment overlay */}
      <motion.div
        ref={overlayRef}
        className="absolute top-1/2 left-1/2 pointer-events-auto cursor-move"
        style={{
          width: garmentWidth * transform.scale,
          height: garmentHeight * transform.scale,
          transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) rotate(${transform.rotation}deg)`
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        animate={{
          scale: transform.scale
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Garment representation */}
        <div className="w-full h-full relative">
          {product.media_urls?.[0] ? (
            <img
              src={product.media_urls[0]}
              alt={product.title}
              className="w-full h-full object-contain opacity-80 mix-blend-multiply"
              style={{
                filter: 'brightness(1.2) contrast(1.1)'
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-primary/30 to-primary/50 rounded-lg border-2 border-primary/60 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-xs font-medium">{product.title}</div>
                <div className="text-xs opacity-75">{selectedSize} • {selectedColor}</div>
              </div>
            </div>
          )}
          
          {/* Size and fit indicators */}
          <div className="absolute -top-6 left-0 right-0 text-center">
            <div className="inline-block bg-black/70 text-white text-xs px-2 py-1 rounded">
              {selectedSize}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 pointer-events-auto">
        <Button size="sm" variant="secondary" onClick={handleZoomIn}>
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleZoomOut}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleRotate}>
          <RotateCw className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReset}>
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Drag instruction */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
        <Move3D className="h-3 w-3 inline mr-1" />
        Drag to position • Use controls to adjust
      </div>
    </div>
  );
};
