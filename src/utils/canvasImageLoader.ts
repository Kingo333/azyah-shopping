/**
 * Pre-loads images with CORS handling for canvas rendering
 */

export interface ImageLoadResult {
  id: string;
  image: HTMLImageElement;
  url: string;
}

export interface ImageLoadError {
  id: string;
  url: string;
  error: string;
}

/**
 * Converts Supabase storage URLs to direct public URLs for CORS
 */
function getDirectStorageUrl(url: string): string {
  // If already a direct Supabase URL, return as-is
  if (url.includes('klwolsopucgswhtdlsps.supabase.co')) {
    return url;
  }
  
  // If it's a proxied URL, convert to direct
  if (url.includes('api.azyahstyle.com/storage')) {
    return url.replace('api.azyahstyle.com', 'klwolsopucgswhtdlsps.supabase.co');
  }
  
  // If it's an external URL (ASOS, etc), return as-is
  return url;
}

/**
 * Pre-loads a single image with CORS support and retry logic
 */
async function loadSingleImage(
  id: string,
  url: string,
  maxRetries: number = 2
): Promise<ImageLoadResult> {
  const directUrl = getDirectStorageUrl(url);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const result = await new Promise<ImageLoadResult>((resolve, reject) => {
        img.onload = () => {
          console.log(`✓ Loaded: ${id} (${img.width}x${img.height}) - ${directUrl.substring(0, 50)}...`);
          resolve({ id, image: img, url: directUrl });
        };
        
        img.onerror = (e) => {
          reject(new Error(`Failed to load image: ${directUrl}`));
        };
        
        // Start loading
        img.src = directUrl;
      });
      
      return result;
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`Retry ${attempt + 1}/${maxRetries} for ${id}`);
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to load ${id} after ${maxRetries} retries`);
}

/**
 * Pre-loads all canvas images in parallel with progress tracking
 */
export async function preloadCanvasImages(
  images: Array<{ id: string; url: string }>,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ 
  loaded: ImageLoadResult[], 
  failed: ImageLoadError[] 
}> {
  const total = images.length;
  let completed = 0;
  
  console.log(`🎨 Pre-loading ${total} images for canvas...`);
  
  const results = await Promise.allSettled(
    images.map(async ({ id, url }) => {
      try {
        const result = await loadSingleImage(id, url);
        completed++;
        onProgress?.(completed, total);
        return result;
      } catch (error) {
        completed++;
        onProgress?.(completed, total);
        throw { id, url, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })
  );
  
  const loaded: ImageLoadResult[] = [];
  const failed: ImageLoadError[] = [];
  
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      loaded.push(result.value);
    } else {
      failed.push(result.reason);
    }
  });
  
  console.log(`✓ Pre-loaded ${loaded.length}/${total} images`);
  if (failed.length > 0) {
    console.warn(`✗ Failed to load ${failed.length} images:`, failed);
  }
  
  return { loaded, failed };
}
