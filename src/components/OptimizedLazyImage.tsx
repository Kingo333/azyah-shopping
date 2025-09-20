import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedLazyImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  blurDataURL?: string;
}

export function OptimizedLazyImage({ 
  src, 
  alt, 
  className = "", 
  aspectRatio = "16/9",
  blurDataURL 
}: OptimizedLazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <Skeleton className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        </Skeleton>
      )}

      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
        />
      )}

      {/* Main image */}
      {isInView && (
        <motion.img
          ref={imgRef}
          src={hasError ? "/placeholder.svg" : src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleLoad}
          onError={handleError}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ 
            scale: isLoaded ? 1 : 1.1, 
            opacity: isLoaded ? 1 : 0 
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      {/* Shimmer loading effect */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      )}
    </div>
  );
}