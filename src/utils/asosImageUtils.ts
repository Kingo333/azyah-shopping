// Utility functions for ASOS image handling with responsive rendering

// Build srcSet for responsive images (ASOS only)
export function buildAsosSrcSet(baseUrl: string): string {
  // Only build srcSet for ASOS URLs
  if (!baseUrl.includes('asos-media.com')) return '';
  
  const widths = [400, 800, 1200, 1600];
  return widths.map(px => `${upgradeAsosImageUrl(baseUrl, px)} ${px}w`).join(', ');
}

// Upgrade ASOS image URL with quality parameters
export function upgradeAsosImageUrl(url: string, minWid = 1500): string {
  try {
    const ASOS_HOSTS = ['images.asos-media.com', 'asos-media.com'];
    const urlObj = new URL(url);
    
    // Only process ASOS URLs - guard against Supabase URLs
    if (!ASOS_HOSTS.some(h => urlObj.hostname.endsWith(h))) return url;

    // Strip existing macros and size parameters
    urlObj.pathname = urlObj.pathname.replace(/\$[^$]*\$/g, '');
    
    // Clear existing parameters to avoid conflicts
    urlObj.search = '';

    // Upgrade width - ensure minimum for quality
    const targetWid = Math.max(minWid, 800);
    urlObj.searchParams.set('wid', String(targetWid));

    // Set ASOS-specific quality parameters in correct order
    urlObj.searchParams.set('fit', 'constrain');
    urlObj.searchParams.set('fmt', 'webp');
    urlObj.searchParams.set('qlt', '85');
    urlObj.searchParams.set('resmode', 'sharp2');
    urlObj.searchParams.set('op_sharpen', '1');
    
    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to upgrade ASOS image URL:', url, error);
    return url;
  }
}

// Get responsive image props
export function getResponsiveImageProps(imageUrl: string, sizes = "(max-width: 768px) 100vw, 50vw") {
  const src = upgradeAsosImageUrl(imageUrl, 800);
  const srcSet = buildAsosSrcSet(imageUrl);
  
  return {
    src,
    srcSet,
    sizes,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    style: {
      imageRendering: 'auto' as const,
      WebkitBackfaceVisibility: 'hidden' as const,
      backfaceVisibility: 'hidden' as const,
    }
  };
}