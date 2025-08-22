// Optimized ASOS image handling with progressive loading and context-aware sizing

type ImageContext = 'thumbnail' | 'main' | 'detail' | 'gallery';

interface AsosImageConfig {
  width: number;
  quality: number;
  format: string;
  fit: string;
}

// Ultra-optimized for mobile speed
const IMAGE_CONFIGS: Record<ImageContext, AsosImageConfig> = {
  thumbnail: { width: 80, quality: 70, format: 'jpg', fit: 'constrain' },
  main: { width: 400, quality: 75, format: 'jpg', fit: 'constrain' },       // Aggressive mobile optimization
  detail: { width: 600, quality: 78, format: 'jpg', fit: 'constrain' },     // Faster modal loading
  gallery: { width: 320, quality: 72, format: 'jpg', fit: 'constrain' }     // Minimal grid loading
};

// Progressive loading configurations
const PROGRESSIVE_CONFIGS = {
  placeholder: { width: 50, quality: 30, blur: true },
  lowRes: { width: 300, quality: 60 },
  highRes: { width: 1200, quality: 90 }
};

// Optimize ASOS image URL with context-aware parameters
export function upgradeAsosImageUrl(url: string, context: ImageContext = 'main'): string {
  try {
    const ASOS_HOSTS = ['images.asos-media.com', 'asos-media.com'];
    const urlObj = new URL(url);
    
    if (!ASOS_HOSTS.some(h => urlObj.hostname.endsWith(h))) return url;

    // Strip existing macros
    urlObj.pathname = urlObj.pathname.replace(/\$[^$]*\$/g, '');

    const config = IMAGE_CONFIGS[context];
    
    // Apply context-specific parameters
    urlObj.searchParams.set('wid', String(config.width));
    urlObj.searchParams.set('qlt', String(config.quality));
    urlObj.searchParams.set('fmt', config.format);
    urlObj.searchParams.set('fit', config.fit);
    urlObj.searchParams.set('resmode', 'sharp2');
    urlObj.searchParams.set('bg', 'fff');
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Generate progressive loading URLs
export function getProgressiveImageUrls(baseUrl: string) {
  try {
    const ASOS_HOSTS = ['images.asos-media.com', 'asos-media.com'];
    const urlObj = new URL(baseUrl);
    
    if (!ASOS_HOSTS.some(h => urlObj.hostname.endsWith(h))) {
      return {
        placeholder: baseUrl,
        lowRes: baseUrl,
        highRes: baseUrl
      };
    }

    // Strip existing macros
    urlObj.pathname = urlObj.pathname.replace(/\$[^$]*\$/g, '');

    return {
      placeholder: createAsosUrl(urlObj, PROGRESSIVE_CONFIGS.placeholder),
      lowRes: createAsosUrl(urlObj, PROGRESSIVE_CONFIGS.lowRes),
      highRes: createAsosUrl(urlObj, PROGRESSIVE_CONFIGS.highRes)
    };
  } catch {
    return {
      placeholder: baseUrl,
      lowRes: baseUrl,
      highRes: baseUrl
    };
  }
}

function createAsosUrl(urlObj: URL, config: any): string {
  const newUrl = new URL(urlObj);
  newUrl.searchParams.set('wid', String(config.width));
  newUrl.searchParams.set('qlt', String(config.quality));
  newUrl.searchParams.set('fmt', 'jpg');
  newUrl.searchParams.set('fit', 'constrain');
  newUrl.searchParams.set('resmode', 'sharp2');
  newUrl.searchParams.set('bg', 'fff');
  return newUrl.toString();
}

// Build ultra-fast mobile srcSet 
export function buildAsosSrcSet(baseUrl: string, context: ImageContext = 'main'): string {
  const widths = context === 'thumbnail' 
    ? [64, 80]                // Minimal thumbnail sizes
    : context === 'main' 
    ? [300, 400]              // Fast swipe loading
    : context === 'detail'
    ? [400, 600]              // Quick modal opening
    : [200, 320];             // Minimal grid sizes
    
  return widths.map(width => {
    const url = upgradeAsosImageUrl(baseUrl, context);
    const urlObj = new URL(url);
    urlObj.searchParams.set('wid', String(width));
    return `${urlObj.toString()} ${width}w`;
  }).join(', ');
}

// Enhanced responsive image props with progressive loading
export function getResponsiveImageProps(
  imageUrl: string, 
  context: ImageContext = 'main',
  sizes?: string
) {
  const defaultSizes = {
    thumbnail: "64px",
    main: "(max-width: 480px) 100vw, (max-width: 768px) 90vw, 50vw",      // Mobile-first sizing
    detail: "(max-width: 480px) 95vw, (max-width: 768px) 85vw, 60vw",    // Mobile modal optimized
    gallery: "(max-width: 480px) 50vw, (max-width: 768px) 45vw, 25vw"    // Mobile grid optimized
  };

  const src = upgradeAsosImageUrl(imageUrl, context);
  const srcSet = buildAsosSrcSet(imageUrl, context);
  const progressive = getProgressiveImageUrls(imageUrl);
  
  return {
    src,
    srcSet,
    sizes: sizes || defaultSizes[context],
    loading: context === 'main' ? 'eager' as const : 'lazy' as const,
    decoding: 'async' as const,
    progressive,
    style: {
      imageRendering: 'auto' as const,
      WebkitBackfaceVisibility: 'hidden' as const,
      backfaceVisibility: 'hidden' as const,
    }
  };
}

// Preload critical images
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

// Batch preload multiple images with priority
export async function preloadImages(urls: string[], maxConcurrent = 3): Promise<void> {
  const results: Promise<void>[] = [];
  
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(url => preloadImage(url));
    results.push(...batchPromises);
    
    // Wait for current batch before starting next
    if (i + maxConcurrent < urls.length) {
      await Promise.allSettled(batchPromises);
    }
  }
  
  await Promise.allSettled(results);
}