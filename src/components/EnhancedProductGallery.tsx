
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, RotateCw, Loader2 } from 'lucide-react';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { getResponsiveImageProps, preloadImages } from '@/utils/asosImageUtils';
import ProgressiveImage from '@/components/ProgressiveImage';

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
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);

  const handle360Spin = () => {
    setRotation(prev => prev + 90);
  };

  const handleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // Preload first few images when component mounts
  useEffect(() => {
    if (images.length > 1) {
      setIsPreloading(true);
      const imagesToPreload = images.slice(0, Math.min(3, images.length));
      
      preloadImages(imagesToPreload, 2)
        .then(() => {
          setPreloadProgress(100);
          setIsPreloading(false);
        })
        .catch(() => {
          setIsPreloading(false);
        });
    }
  }, [images]);

  const handleImageChange = useCallback((index: number) => {
    setSelectedImage(index);
    setImageLoaded(false);
    setImageError(false);
    setRotation(0); // Reset rotation when changing images
    
    // Preload next image if not already loaded
    if (index + 1 < images.length) {
      preloadImages([images[index + 1]], 1);
    }
  }, [images]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-square md:aspect-[4/5] overflow-hidden rounded-lg bg-accent group">
        {/* Preload Progress Indicator */}
        {isPreloading && (
          <div className="absolute top-2 left-2 z-20 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading images...</span>
          </div>
        )}
        
        <motion.div
          key={selectedImage}
          className={`relative w-full h-full cursor-zoom-in transition-all duration-300 ${
            isZoomed ? 'scale-150' : 'scale-100'
          }`}
          style={{ rotate: `${rotation}deg` }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: isZoomed ? 1.5 : 1 
          }}
          transition={{ duration: 0.3 }}
          onClick={handleZoom}
        >
          <ProgressiveImage
            src={images[selectedImage] || '/placeholder.svg'}
            alt={`${productTitle} view ${selectedImage + 1}`}
            className="w-full h-full object-cover"
            priority={selectedImage === 0}
            onLoad={handleImageLoad}
            onError={handleImageError}
            {...getResponsiveImageProps(
              images[selectedImage] || '/placeholder.svg',
              'detail',
              "(max-width: 768px) 90vw, 50vw"
            )}
          />
        </motion.div>
        
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
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <motion.button
              key={index}
              onClick={() => handleImageChange(index)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all duration-200 ${
                selectedImage === index 
                  ? 'border-primary shadow-md scale-105' 
                  : 'border-border hover:border-primary/50'
              }`}
              whileHover={{ scale: selectedImage === index ? 1.05 : 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <ProgressiveImage
                src={image}
                alt={`${productTitle} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                priority={false}
                showProgress={false}
                {...getResponsiveImageProps(image, 'thumbnail', "64px")}
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Image Counter and Status */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{selectedImage + 1} of {images.length}</span>
          {isPreloading && (
            <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${preloadProgress}%` }}
              />
            </div>
          )}
        </div>
        {isZoomed && (
          <span className="text-primary">Tap image to zoom out</span>
        )}
      </div>
    </div>
  );
};
