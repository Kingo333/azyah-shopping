
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, RotateCw } from 'lucide-react';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';

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
  hasARMesh = false,
  onARTryOn
}) => {
  const { isEnabled } = useFeatureFlags();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handle360Spin = () => {
    setRotation(prev => prev + 90);
  };

  const handleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const handleImageChange = (index: number) => {
    setSelectedImage(index);
    setImageLoaded(false);
    setImageError(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-[3/4] md:aspect-[3/4] lg:aspect-[4/5] min-h-[400px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden rounded-lg bg-card group">
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        )}
        
        <motion.img
          key={`${selectedImage}-${images[selectedImage]}`}
          {...getResponsiveImageProps(
            images[selectedImage] || '/placeholder.svg',
            "(max-width: 768px) 90vw, 50vw"
          )}
          alt={`${productTitle} view ${selectedImage + 1}`}
          className={`w-full h-full object-contain cursor-zoom-in transition-all duration-300 ${
            isZoomed ? 'scale-150 object-cover' : 'scale-100'
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ rotate: `${rotation}deg` }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: imageLoaded ? 1 : 0, 
            scale: isZoomed ? 1.5 : 1 
          }}
          transition={{ duration: 0.3 }}
          onClick={handleZoom}
          onLoad={() => {
            console.log('Image loaded successfully:', images[selectedImage]);
            handleImageLoad();
          }}
          onError={(e) => {
            console.error('Image failed to load:', images[selectedImage], e);
            handleImageError();
          }}
          loading="eager"
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
        </div>

        {/* Thumbnail Navigation - Overlaid at bottom left */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 flex gap-2 max-w-[calc(100%-2rem)] overflow-x-auto">
            {images.map((image, index) => (
              <motion.button
                key={index}
                onClick={() => handleImageChange(index)}
                className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all duration-200 bg-background/80 backdrop-blur-sm ${
                  selectedImage === index 
                    ? 'border-primary shadow-md scale-105' 
                    : 'border-border hover:border-primary/50'
                }`}
                whileHover={{ scale: selectedImage === index ? 1.05 : 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  {...getResponsiveImageProps(image, "48px")}
                  alt={`${productTitle} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Image Counter */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{selectedImage + 1} of {images.length}</span>
        {isZoomed && (
          <span className="text-primary">Tap image to zoom out</span>
        )}
      </div>
    </div>
  );
};
