// Smart image component with fallback handling for mobile networks
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { displaySrc, displaySrcSet } from '../lib/displaySrc';
import { getImageFallbacks } from '../lib/fallbackImage';
import { useConnectionAware } from '../hooks/useConnectionAware';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export const SmartImage = ({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  loading = 'lazy',
  onLoad,
  onError
}: SmartImageProps) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [isError, setIsError] = useState(false);

  const fallbacks = getImageFallbacks(src);

  const handleError = () => {
    const nextIndex = fallbackIndex + 1;
    
    console.warn(`Image failed to load: ${currentSrc}, trying fallback ${nextIndex}/${fallbacks.length}`);
    
    if (nextIndex < fallbacks.length) {
      setCurrentSrc(fallbacks[nextIndex]);
      setFallbackIndex(nextIndex);
    } else {
      console.error(`All image fallbacks failed for: ${src}`);
      setIsError(true);
      onError?.();
    }
  };

  const handleLoad = () => {
    setIsError(false);
    onLoad?.();
  };

  if (isError) {
    return (
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
          <p className="text-xs">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={displaySrc(currentSrc)}
      srcSet={displaySrcSet(currentSrc)}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      crossOrigin="anonymous"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};