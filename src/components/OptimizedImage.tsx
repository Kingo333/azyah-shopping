import React, { useState } from 'react';
import { useOptimizedImage } from '@/hooks/useOptimizedImage';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  fallback?: string;
  showOptimizationIndicator?: boolean;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  targetWidth = 720,
  targetHeight = 1080,
  quality = 90,
  fallback = '/placeholder.svg',
  showOptimizationIndicator = true,
  className,
  onLoad,
  onError,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const { 
    src: optimizedSrc, 
    isOptimizing, 
    cached, 
    isOptimized 
  } = useOptimizedImage({
    originalUrl: src,
    targetWidth,
    targetHeight,
    quality,
    enabled: !hasError
  });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoaded(true);
    onLoad?.(e);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Optimized image failed to load, using fallback:', optimizedSrc);
    setHasError(true);
    (e.target as HTMLImageElement).src = fallback;
    setImageLoaded(true);
    onError?.(e);
  };

  return (
    <div className="relative inline-block">
      {/* Loading indicator */}
      {(isOptimizing || !imageLoaded) && !hasError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10 rounded-md">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {isOptimizing ? 'Optimizing...' : 'Loading...'}
            </span>
            {cached && (
              <span className="text-xs text-primary font-medium">Cached ✓</span>
            )}
          </div>
        </div>
      )}
      
      {/* Optimized image */}
      <img
        src={optimizedSrc}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          imageLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        {...props}
      />
      
      {/* Quality indicator */}
      {showOptimizationIndicator && isOptimized && imageLoaded && !hasError && (
        <div className="absolute top-2 right-2 z-20">
          <div className="bg-green-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full shadow-lg border border-green-400/30">
            HD ✓
          </div>
        </div>
      )}
    </div>
  );
};