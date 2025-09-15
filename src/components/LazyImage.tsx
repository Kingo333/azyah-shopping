import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { displaySrc, displaySrcSet } from '../lib/displaySrc';
import { getImageFallbacks } from '../lib/fallbackImage';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurDataUrl?: string;
  quality?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  srcSet?: string;
}

const LazyImage = ({
  src,
  alt,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkwyNCAyNE0yNCAxNkwxNiAyNCIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K',
  blurDataUrl,
  quality = 75,
  priority = false,
  onLoad,
  onError,
  sizes,
  srcSet
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  // Optimize image URL based on device capabilities
  const getOptimizedSrc = (originalSrc: string, targetQuality: number = quality) => {
    // If it's already a data URL or blob, return as is
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    // For external images, we could integrate with image optimization services
    // For now, we'll add quality parameter if it's an Unsplash image
    if (originalSrc.includes('unsplash.com')) {
      const url = new URL(originalSrc);
      url.searchParams.set('q', targetQuality.toString());
      
      // Add auto format for modern browsers
      if (supportsWebP()) {
        url.searchParams.set('fm', 'webp');
      } else if (supportsAvif()) {
        url.searchParams.set('fm', 'avif');
      }
      
      return url.toString();
    }

    return originalSrc;
  };

  // Check browser support for modern image formats
  const supportsWebP = () => {
    return new Promise<boolean>((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => resolve(webP.height === 2);
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  };

  const supportsAvif = () => {
    return new Promise<boolean>((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => resolve(avif.height === 2);
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=';
    });
  };

  // Generate responsive image sizes
  const generateSrcSet = (baseSrc: string) => {
    if (srcSet) return srcSet;
    
    const widths = [480, 768, 1024, 1280, 1440];
    return widths
      .map(width => {
        const url = new URL(getOptimizedSrc(baseSrc));
        url.searchParams.set('w', width.toString());
        return `${url.toString()} ${width}w`;
      })
      .join(', ');
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    const fallbacks = getImageFallbacks(src);
    const nextIndex = fallbackIndex + 1;
    
    if (nextIndex < fallbacks.length) {
      setCurrentSrc(fallbacks[nextIndex]);
      setFallbackIndex(nextIndex);
      setIsLoaded(false); // Reset loading state for retry
    } else {
      setIsError(true);
      onError?.();
    }
  };

  const optimizedSrc = getOptimizedSrc(currentSrc);

  return (
    <div className="relative overflow-hidden">
      {/* Placeholder while loading */}
      {!isLoaded && !isError && (
        <div className={cn(
          "absolute inset-0 bg-muted animate-pulse",
          className
        )}>
          {blurDataUrl ? (
            <img
              src={blurDataUrl}
              alt=""
              className="w-full h-full object-cover filter blur-sm scale-110"
            />
          ) : (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          )}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}>
          <div className="text-center p-4">
            <svg
              className="w-8 h-8 mx-auto mb-2"
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
            <p className="text-xs">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={displaySrc(optimizedSrc)}
          srcSet={displaySrcSet(optimizedSrc) || generateSrcSet(currentSrc)}
          sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          crossOrigin="anonymous"
        />
      )}

      {/* Loading indicator */}
      {isInView && !isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;