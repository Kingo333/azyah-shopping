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

    // ASOS uses different URL patterns, try common optimization approaches
    const { width, height, quality = 90 } = dimensions;
    
    // Method 1: Query parameters (most common for CDNs)
    urlObj.searchParams.set('w', width.toString());
    urlObj.searchParams.set('h', height.toString());
    urlObj.searchParams.set('q', quality.toString());
    
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
  const devicePixelRatio = window.devicePixelRatio || 1;
  const isMobile = window.innerWidth < 768;
  
  switch (containerType) {
    case 'swipe':
      // Swipe cards are larger, need high quality
      return {
        width: Math.round((isMobile ? 400 : 500) * devicePixelRatio),
        height: Math.round((isMobile ? 600 : 750) * devicePixelRatio),
        quality: 95
      };
    
    case 'grid':
      // Grid items are smaller but still need good quality
      return {
        width: Math.round((isMobile ? 300 : 400) * devicePixelRatio),
        height: Math.round((isMobile ? 450 : 600) * devicePixelRatio),
        quality: 90
      };
    
    case 'detail':
      // Detail view needs highest quality
      return {
        width: Math.round((isMobile ? 500 : 800) * devicePixelRatio),
        height: Math.round((isMobile ? 750 : 1200) * devicePixelRatio),
        quality: 98
      };
    
    default:
      return {
        width: Math.round(400 * devicePixelRatio),
        height: Math.round(600 * devicePixelRatio),
        quality: 90
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