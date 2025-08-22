import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getProgressiveImageUrls } from '@/utils/asosImageUtils';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  srcSet?: string;
  showProgress?: boolean;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  priority = false,
  onLoad,
  onError,
  sizes,
  srcSet,
  showProgress = true
}) => {
  const [loadingState, setLoadingState] = useState<'placeholder' | 'lowRes' | 'highRes' | 'error'>('placeholder');
  const [isInView, setIsInView] = useState(priority);
  const [progress, setProgress] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const progressive = getProgressiveImageUrls(src);

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
        rootMargin: '100px'
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

  // Progressive loading effect
  useEffect(() => {
    if (!isInView) return;

    let cancelled = false;

    const loadImage = (url: string, state: typeof loadingState) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          if (!cancelled) {
            setLoadingState(state);
            setProgress(state === 'lowRes' ? 50 : state === 'highRes' ? 100 : 25);
            resolve();
          }
        };
        
        img.onerror = () => {
          if (!cancelled) {
            setLoadingState('error');
            reject();
          }
        };
        
        img.src = url;
      });
    };

    const loadProgressively = async () => {
      try {
        // Load placeholder first (usually instant)
        setProgress(10);
        
        // Load low-res version
        await loadImage(progressive.lowRes, 'lowRes');
        
        // Load high-res version
        await loadImage(progressive.highRes, 'highRes');
        
        onLoad?.();
      } catch {
        setLoadingState('error');
        onError?.();
      }
    };

    loadProgressively();

    return () => {
      cancelled = true;
    };
  }, [isInView, progressive, onLoad, onError]);

  const getCurrentSrc = () => {
    switch (loadingState) {
      case 'placeholder':
        return progressive.placeholder;
      case 'lowRes':
        return progressive.lowRes;
      case 'highRes':
        return progressive.highRes;
      case 'error':
        return progressive.placeholder;
      default:
        return progressive.placeholder;
    }
  };

  const getImageOpacity = () => {
    switch (loadingState) {
      case 'placeholder':
        return 'opacity-40';
      case 'lowRes':
        return 'opacity-80';
      case 'highRes':
        return 'opacity-100';
      case 'error':
        return 'opacity-30';
      default:
        return 'opacity-0';
    }
  };

  return (
    <div ref={imgRef} className="relative overflow-hidden">
      {/* Background placeholder */}
      <div className={cn(
        "absolute inset-0 bg-muted animate-pulse",
        loadingState !== 'placeholder' && 'animate-none',
        className
      )} />

      {/* Progressive loading indicator */}
      {showProgress && isInView && loadingState !== 'highRes' && loadingState !== 'error' && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-background/80 backdrop-blur-sm rounded-full p-1">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Progress bar */}
      {showProgress && isInView && loadingState !== 'error' && progress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error state */}
      {loadingState === 'error' && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground",
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
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={getCurrentSrc()}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-all duration-500 ease-out",
            getImageOpacity(),
            loadingState === 'lowRes' && 'filter blur-sm scale-105',
            loadingState === 'highRes' && 'filter-none scale-100',
            className
          )}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}
    </div>
  );
};

export default ProgressiveImage;