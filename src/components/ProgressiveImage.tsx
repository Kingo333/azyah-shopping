import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useConnectionAware } from '@/hooks/useConnectionAware';
import { getOptimalImageDimensions, generateImageSources } from '@/utils/imageOptimizer';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  containerType?: 'swipe' | 'grid' | 'detail';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
}

// Tiny blur placeholder as base64
const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjNmNGY2Ii8+Cjwvc3ZnPg==';

export const ProgressiveImage = ({
  src,
  alt,
  className,
  containerType = 'grid',
  priority = false,
  onLoad,
  onError,
  sizes
}: ProgressiveImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentQuality, setCurrentQuality] = useState<'low' | 'medium' | 'high'>('low');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { connectionSpeed, getImageQuality, shouldPreload } = useConnectionAware({
    slowConnectionFeatures: ['highQualityImages'],
    deferredFeatures: ['animatedLoading'],
    priorityFeatures: ['basicImages']
  });

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: shouldPreload('medium') ? '100px' : '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView, shouldPreload]);

  // Progressive loading: start with low quality, upgrade as needed
  useEffect(() => {
    if (!isInView) return;

    const startQuality = connectionSpeed === 'slow' ? 'low' : 'medium';
    setCurrentQuality(startQuality);

    // Upgrade quality after initial load on faster connections
    if (connectionSpeed === 'fast' && !priority) {
      const timer = setTimeout(() => {
        setCurrentQuality('high');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, connectionSpeed, priority]);

  const getOptimizedSrc = () => {
    if (!src || !isInView) return BLUR_PLACEHOLDER;

    const dimensions = getOptimalImageDimensions(containerType);
    const qualityMap = {
      low: Math.max(getImageQuality() - 20, 50),
      medium: getImageQuality(),
      high: Math.min(getImageQuality() + 10, 95)
    };

    const optimizedDimensions = {
      ...dimensions,
      quality: qualityMap[currentQuality]
    };

    const sources = generateImageSources(src, containerType);
    return sources.primary;
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  const optimizedSrc = getOptimizedSrc();

  return (
    <div className="relative overflow-hidden">
      {/* Blur placeholder - always shown while loading */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-500",
        isLoaded ? "opacity-0" : "opacity-100",
        className
      )}>
        <div className="w-full h-full bg-muted animate-pulse" />
      </div>

      {/* Error state */}
      {isError && (
        <div className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}>
          <div className="text-center p-4">
            <svg
              className="w-6 h-6 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      )}

      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          className={cn(
            "transition-all duration-500",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
        />
      )}

      {/* Loading indicator for slow connections */}
      {isInView && !isLoaded && !isError && connectionSpeed === 'slow' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};