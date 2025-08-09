
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, RotateCw, Camera, Sparkles } from 'lucide-react';

interface EnhancedProductGalleryProps {
  images: string[];
  productTitle: string;
  productId?: string;
  hasARMesh?: boolean;
  onARTryOn?: () => void;
}

export const EnhancedProductGallery: React.FC<EnhancedProductGalleryProps> = ({
  images,
  productTitle,
  productId,
  hasARMesh = true, // Default to true for clothing items
  onARTryOn
}) => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handle360Spin = () => {
    setRotation(prev => prev + 90);
  };

  const handleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const handleARTryOn = () => {
    if (onARTryOn) {
      onARTryOn();
    } else if (productId) {
      // Navigate to AR Try-On page with product ID
      navigate(`/ar-tryOn?product=${productId}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-accent group">
        <motion.img
          key={selectedImage}
          src={images[selectedImage] || '/placeholder.svg'}
          alt={`${productTitle} view ${selectedImage + 1}`}
          className={`w-full h-full object-cover cursor-zoom-in transition-transform duration-300 ${
            isZoomed ? 'scale-150' : 'scale-100'
          }`}
          style={{ rotate: `${rotation}deg` }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: isZoomed ? 1.5 : 1 }}
          transition={{ duration: 0.3 }}
          onClick={handleZoom}
        />
        
        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
          <div className="absolute top-4 right-4 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              size="sm"
              variant="secondary"
              className="bg-background/80 backdrop-blur-sm"
              onClick={handleZoom}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            {images.length > 1 && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-background/80 backdrop-blur-sm"
                onClick={handle360Spin}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {hasARMesh && (
            <Button
              size="sm"
              className="absolute bottom-4 left-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
              onClick={handleARTryOn}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Try in AR
            </Button>
          )}
        </div>
        
        {/* AR Badge */}
        {hasARMesh && (
          <Badge className="absolute top-4 left-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
            <Camera className="h-3 w-3 mr-1" />
            AR Ready
          </Badge>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <motion.button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all duration-200 ${
                selectedImage === index 
                  ? 'border-primary shadow-md scale-105' 
                  : 'border-border hover:border-primary/50'
              }`}
              whileHover={{ scale: selectedImage === index ? 1.05 : 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={image}
                alt={`${productTitle} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Image Counter and AR Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{selectedImage + 1} of {images.length}</span>
        {hasARMesh && (
          <div className="flex items-center gap-1 text-purple-500">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs">AR Experience Available</span>
          </div>
        )}
        {isZoomed && (
          <span className="text-primary">Tap image to zoom out</span>
        )}
      </div>
    </div>
  );
};
