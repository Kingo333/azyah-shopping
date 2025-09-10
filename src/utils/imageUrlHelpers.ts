// URL normalization and versioning for consistent image caching

// Normalize image URL for consistent caching
export function normalizeImageUrl(url: string): string {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    
    // Remove transient cache-busting parameters
    const transientParams = ['t', 'cache', 'timestamp', '_t', 'cb'];
    transientParams.forEach(param => urlObj.searchParams.delete(param));
    
    return urlObj.toString();
  } catch {
    // Handle relative URLs or malformed URLs
    return url;
  }
}

// Add version parameter for cache busting when image actually changes
export function addImageVersion(url: string, version?: string | number): string {
  if (!url || !version) return url;
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('v', String(version));
    return urlObj.toString();
  } catch {
    // Fallback for relative URLs
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  }
}

// Check if connection supports preloading
export function shouldPreloadImages(): boolean {
  // Check for data saver mode
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection?.saveData) return false;
    if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') return false;
  }
  
  // Check if user is on a metered connection (mobile data)
  if ('getBattery' in navigator) {
    // Skip preloading on low battery
    return true; // We'll implement battery check later if needed
  }
  
  return true;
}

// Generate responsive image sizes
export function generateImageSizes(containerType: 'swipe' | 'grid' | 'detail' | 'thumbnail' = 'grid'): string {
  switch (containerType) {
    case 'swipe':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw';
    case 'detail':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 50vw';
    case 'thumbnail':
      return '(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 15vw';
    case 'grid':
    default:
      return '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw';
  }
}

// Preload critical images
export function preloadImage(url: string): void {
  if (!shouldPreloadImages() || !url) return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = normalizeImageUrl(url);
  link.as = 'image';
  
  // Remove after loading to avoid memory leaks
  link.onload = () => document.head.removeChild(link);
  link.onerror = () => document.head.removeChild(link);
  
  document.head.appendChild(link);
}

// Batch preload multiple images
export function preloadImages(urls: string[], maxCount: number = 2): void {
  if (!shouldPreloadImages()) return;
  
  urls.slice(0, maxCount).forEach(url => {
    if (url) preloadImage(url);
  });
}