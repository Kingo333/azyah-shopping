/**
 * Image URL optimization utilities for better quality display
 */

interface ImageDimensions {
  width: number;
  height: number;
  quality?: number;
}

/**
 * Optimizes ASOS image URLs by adding size and quality parameters
 */
export const optimizeAsosImageUrl = (url: string, dimensions: ImageDimensions): string => {
  if (!url || url === '/placeholder.svg') {
    return url;
  }

  try {
    const urlObj = new URL(url);
    
    // Check if it's an ASOS image URL
    if (!urlObj.hostname.includes('asos.com') && !urlObj.hostname.includes('images.asos-media.com')) {
      return url;
    }

    const { width, height, quality = 95 } = dimensions;
    
    // ASOS uses different URL patterns, try common optimization approaches
    // Method 1: Query parameters (most common for CDNs)
    urlObj.searchParams.set('w', width.toString());
    urlObj.searchParams.set('h', height.toString());
    urlObj.searchParams.set('q', quality.toString());
    
    // Add format optimization for better mobile performance
    if ('webp' in document.createElement('canvas').getContext('2d')) {
      urlObj.searchParams.set('fm', 'webp');
    }
    
    // Add sharpening for mobile displays
    urlObj.searchParams.set('sharp', '1');
    
    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to optimize image URL:', error);
    return url;
  }
};

/**
 * Get optimal image dimensions based on viewport and container
 */
export const getOptimalImageDimensions = (containerType: 'swipe' | 'grid' | 'detail'): ImageDimensions => {
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x for performance
  const isMobile = window.innerWidth < 768;
  const isRetina = devicePixelRatio >= 2;
  
  // Higher quality settings for mobile retina displays
  const mobileQuality = isRetina ? 98 : 95;
  const desktopQuality = isRetina ? 95 : 90;
  
  switch (containerType) {
    case 'swipe':
      // Swipe cards are larger, need highest quality for mobile
      return {
        width: Math.round((isMobile ? 450 : 500) * devicePixelRatio),
        height: Math.round((isMobile ? 675 : 750) * devicePixelRatio),
        quality: isMobile ? mobileQuality : desktopQuality
      };
    
    case 'grid':
      // Grid items optimized for mobile viewing
      return {
        width: Math.round((isMobile ? 350 : 400) * devicePixelRatio),
        height: Math.round((isMobile ? 525 : 600) * devicePixelRatio),
        quality: isMobile ? mobileQuality : desktopQuality
      };
    
    case 'detail':
      // Detail view needs highest quality, especially on mobile
      return {
        width: Math.round((isMobile ? 600 : 800) * devicePixelRatio),
        height: Math.round((isMobile ? 900 : 1200) * devicePixelRatio),
        quality: 98 // Always highest quality for detail view
      };
    
    default:
      return {
        width: Math.round((isMobile ? 400 : 450) * devicePixelRatio),
        height: Math.round((isMobile ? 600 : 675) * devicePixelRatio),
        quality: isMobile ? mobileQuality : desktopQuality
      };
  }
};

/**
 * Optimizes an array of image URLs for a specific container type
 */
export const optimizeImageUrls = (urls: string[] | undefined, containerType: 'swipe' | 'grid' | 'detail' = 'grid'): string[] => {
  if (!urls || !Array.isArray(urls)) {
    return ['/placeholder.svg'];
  }

  const dimensions = getOptimalImageDimensions(containerType);
  
  return urls.map(url => optimizeAsosImageUrl(url, dimensions));
};