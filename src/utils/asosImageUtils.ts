// Utility functions for ASOS image handling with responsive rendering

// Build srcSet for responsive images
export function buildAsosSrcSet(baseUrl: string): string {
  const widths = [400, 800, 1200, 1600];
  return widths.map(px => `${upgradeAsosImageUrl(baseUrl, px)} ${px}w`).join(', ');
}

// Upgrade ASOS image URL with quality parameters
export function upgradeAsosImageUrl(url: string, minWid = 1500): string {
  try {
    const ASOS_HOSTS = ['images.asos-media.com', 'asos-media.com'];
    const urlObj = new URL(url);
    
    if (!ASOS_HOSTS.some(h => urlObj.hostname.endsWith(h))) return url;

    // Strip existing macros
    urlObj.pathname = urlObj.pathname.replace(/\$[^$]*\$/g, '');

    // Upgrade width
    const currentWid = Number(urlObj.searchParams.get('wid') || '0');
    const targetWid = Math.max(currentWid || 0, minWid);
    urlObj.searchParams.set('wid', String(targetWid));

    // Set quality parameters
    urlObj.searchParams.set('fit', 'constrain');
    urlObj.searchParams.set('fmt', 'jpg');
    urlObj.searchParams.set('qlt', '90');
    urlObj.searchParams.set('resmode', 'sharp2');
    urlObj.searchParams.set('bg', 'fff');
    
    return urlObj.toString();
  } catch {
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