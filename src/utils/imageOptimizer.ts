/**
 * Enhanced image URL optimization utilities for HD quality display
 */

interface ImageDimensions {
  width: number;
  height: number;
  quality?: number;
}

interface ConnectionInfo {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
}

/**
 * Detects user's connection speed for dynamic quality adjustment
 */
const getConnectionSpeed = (): 'slow' | 'medium' | 'fast' => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return 'medium'; // Default to medium if no connection info
  
  const connectionInfo = connection as ConnectionInfo;
  
  if (connectionInfo.effectiveType === 'slow-2g' || connectionInfo.effectiveType === '2g') {
    return 'slow';
  }
  
  if (connectionInfo.effectiveType === '3g' || (connectionInfo.downlink && connectionInfo.downlink < 1.5)) {
    return 'medium';
  }
  
  return 'fast';
};

/**
 * ASOS-specific URL transformer using their native CDN parameters
 */
const optimizeAsosSpecificUrl = (url: string, targetWidth: number): string => {
  if (!url) return url;
  
  try {
    console.log('🖼️ Original ASOS URL:', url);
    
    // Check if URL already has ASOS sizing parameter
    if (url.includes('$n_') && url.includes('w$')) {
      // Replace existing size with target size
      const optimizedUrl = url.replace(/\$n_\d+w\$/, `$n_${targetWidth}w$`);
      console.log('🔄 ASOS URL optimized (existing param):', optimizedUrl);
      return optimizedUrl;
    }
    
    // If it's an ASOS media URL, try to add size parameter
    if (url.includes('images.asos-media.com') || url.includes('asos.com')) {
      // Try different approaches for ASOS URLs
      if (url.includes('?')) {
        const optimizedUrl = `${url}&$n_${targetWidth}w$`;
        console.log('🔄 ASOS URL optimized (with query):', optimizedUrl);
        return optimizedUrl;
      } else {
        const optimizedUrl = `${url}?$n_${targetWidth}w$`;
        console.log('🔄 ASOS URL optimized (new query):', optimizedUrl);
        return optimizedUrl;
      }
    }
    
    console.log('⚠️ Not an ASOS URL, returning original:', url);
    return url;
  } catch (error) {
    console.warn('❌ Failed to apply ASOS-specific optimization:', error);
    return url;
  }
};

/**
 * Generic CDN URL optimization as fallback
 */
const optimizeGenericCdnUrl = (url: string, dimensions: ImageDimensions): string => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    const { width, height, quality = 95 } = dimensions;
    
    // Add generic CDN parameters
    urlObj.searchParams.set('w', width.toString());
    urlObj.searchParams.set('h', height.toString());
    urlObj.searchParams.set('q', quality.toString());
    
    // Add format optimization for better mobile performance
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx && 'webp' in ctx) {
        urlObj.searchParams.set('fm', 'webp');
      }
    }
    
    // Add sharpening for mobile displays
    urlObj.searchParams.set('sharp', '1');
    
    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to optimize generic CDN URL:', error);
    return url;
  }
};

/**
 * Enhanced ASOS image URL optimizer with multi-source strategy
 */
export const optimizeAsosImageUrl = (url: string, dimensions: ImageDimensions): string => {
  if (!url || url === '/placeholder.svg') {
    return url;
  }

  console.log('🖼️ Processing image URL:', url);

  // TEMPORARILY DISABLE ALL OPTIMIZATION TO RESTORE IMAGES
  console.log('✅ Returning original URL to restore image display');
  return url;
};

/**
 * Get optimal image dimensions with dynamic quality based on device and connection
 */
export const getOptimalImageDimensions = (containerType: 'swipe' | 'grid' | 'detail'): ImageDimensions => {
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x for performance
  const isMobile = window.innerWidth < 768;
  const isRetina = devicePixelRatio >= 2;
  const connectionSpeed = getConnectionSpeed();
  
  // Base quality settings adjusted by connection speed
  const getQualityForConnection = (baseQuality: number): number => {
    switch (connectionSpeed) {
      case 'slow': return Math.max(baseQuality - 15, 70);
      case 'medium': return Math.max(baseQuality - 5, 85);
      case 'fast': return baseQuality;
      default: return baseQuality;
    }
  };
  
  // ASOS-specific size presets that match their CDN
  const asosPresets = {
    mobile: {
      small: 480,
      medium: 640,
      large: 720,
      xlarge: 960
    },
    desktop: {
      small: 640,
      medium: 960,
      large: 1200,
      xlarge: 1440
    }
  };
  
  const presets = isMobile ? asosPresets.mobile : asosPresets.desktop;
  
  switch (containerType) {
    case 'swipe':
      // Swipe cards need highest quality for engagement
      const swipeWidth = isMobile ? presets.large : presets.medium;
      const swipeHeight = Math.round(swipeWidth * 1.5); // 3:2 aspect ratio
      return {
        width: swipeWidth,
        height: swipeHeight,
        quality: getQualityForConnection(isRetina ? 98 : 95)
      };
    
    case 'grid':
      // Grid items optimized for mobile viewing
      const gridWidth = isMobile ? presets.medium : presets.small;
      const gridHeight = Math.round(gridWidth * 1.5);
      return {
        width: gridWidth,
        height: gridHeight,
        quality: getQualityForConnection(isRetina ? 95 : 90)
      };
    
    case 'detail':
      // Detail view needs highest quality available
      const detailWidth = isMobile ? presets.xlarge : presets.large;
      const detailHeight = Math.round(detailWidth * 1.5);
      return {
        width: detailWidth,
        height: detailHeight,
        quality: getQualityForConnection(98) // Always highest quality for detail
      };
    
    default:
      const defaultWidth = isMobile ? presets.medium : presets.small;
      const defaultHeight = Math.round(defaultWidth * 1.5);
      return {
        width: defaultWidth,
        height: defaultHeight,
        quality: getQualityForConnection(isRetina ? 95 : 90)
      };
  }
};

/**
 * Multi-source image strategy with progressive enhancement
 */
export const generateImageSources = (url: string, containerType: 'swipe' | 'grid' | 'detail' = 'grid') => {
  if (!url || url === '/placeholder.svg') {
    return {
      primary: url,
      fallback: url,
      sources: []
    };
  }

  const isAsosUrl = url.includes('asos.com') || url.includes('images.asos-media.com');
  
  if (!isAsosUrl) {
    // For non-ASOS images, use standard optimization
    const dimensions = getOptimalImageDimensions(containerType);
    return {
      primary: optimizeGenericCdnUrl(url, dimensions),
      fallback: url,
      sources: []
    };
  }

  // For ASOS images, create multiple quality options
  const isMobile = window.innerWidth < 768;
  const asosPresets = isMobile ? [480, 640, 720, 960] : [640, 960, 1200];
  
  const sources = asosPresets.map(width => ({
    url: optimizeAsosSpecificUrl(url, width),
    width,
    quality: width >= 960 ? 'high' : width >= 640 ? 'medium' : 'low'
  }));

  const targetDimensions = getOptimalImageDimensions(containerType);
  const primaryUrl = optimizeAsosSpecificUrl(url, targetDimensions.width);

  return {
    primary: primaryUrl,
    fallback: url, // Original URL as ultimate fallback
    sources: sources
  };
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