// Utility functions for handling product images, especially ASOS products

export interface ImageData {
  url: string;
  index: number;
  isAsos: boolean;
}

/**
 * Extract all available images from a product
 * Prioritizes media_urls (which contains all ASOS images) over image_url
 */
export function getAllProductImages(product: any): ImageData[] {
  const images: ImageData[] = [];
  let isAsos = false;

  // Handle media_urls as JSON string (ASOS products)
  if (product.media_urls && typeof product.media_urls === 'string') {
    try {
      const parsed = JSON.parse(product.media_urls);
      if (Array.isArray(parsed) && parsed.length > 0) {
        isAsos = true;
        console.log('ASOS product - all images extracted:', product.id, 'Total:', parsed.length);
        parsed.forEach((url: string, index: number) => {
          if (url && typeof url === 'string' && url.trim()) {
            images.push({
              url: url.trim(),
              index,
              isAsos: true
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse media_urls:', product.media_urls);
    }
  }

  // Handle media_urls as array
  if (images.length === 0 && product.media_urls && Array.isArray(product.media_urls)) {
    product.media_urls.forEach((url: string, index: number) => {
      if (url && typeof url === 'string' && url.trim()) {
        images.push({
          url: url.trim(),
          index,
          isAsos: false
        });
      }
    });
  }

  // Handle nested product structures
  if (images.length === 0) {
    const nestedProduct = product.product || product.products;
    if (nestedProduct?.media_urls && Array.isArray(nestedProduct.media_urls)) {
      nestedProduct.media_urls.forEach((url: string, index: number) => {
        if (url && typeof url === 'string' && url.trim()) {
          images.push({
            url: url.trim(),
            index,
            isAsos: false
          });
        }
      });
    }
  }

  // Fallback to image_url if no media_urls available
  if (images.length === 0 && product.image_url && typeof product.image_url === 'string' && product.image_url.trim()) {
    images.push({
      url: product.image_url.trim(),
      index: 0,
      isAsos: false
    });
  }

  // Debug log for ASOS products
  if (isAsos) {
    console.log(`ASOS product ${product.id} has ${images.length} images available for gallery`);
  }

  return images.length > 0 ? images : [{
    url: '/placeholder.svg',
    index: 0,
    isAsos: false
  }];
}

/**
 * Get the primary image URL (first image)
 */
export function getPrimaryImageUrl(product: any): string {
  const images = getAllProductImages(product);
  return images[0]?.url || '/placeholder.svg';
}

/**
 * Check if a product has multiple images available
 */
export function hasMultipleImages(product: any): boolean {
  const images = getAllProductImages(product);
  return images.length > 1;
}

/**
 * Get image count for debugging
 */
export function getImageCount(product: any): number {
  return getAllProductImages(product).length;
}

/**
 * Get all image URLs as an array for product detail components
 * Handles both array and JSON string formats for media_urls
 */
export function getProductImageUrls(product: any): string[] {
  console.log('=== Product Image URL Debug ===');
  console.log('Product ID:', product?.id);
  console.log('media_urls type:', typeof product?.media_urls);
  console.log('media_urls value:', product?.media_urls);
  console.log('media_urls raw JSON:', JSON.stringify(product?.media_urls));
  
  let finalImages: string[] = [];
  
  // Priority 1: Use media_urls as array (PRIMARY format from Supabase JSONB)
  if (Array.isArray(product.media_urls) && product.media_urls.length > 0) {
    const validImages = product.media_urls
      .filter(url => url && typeof url === 'string' && url.trim())
      .map(url => url.trim());
    
    if (validImages.length > 0) {
      console.log(`✅ Using ${validImages.length} images from media_urls array:`, validImages);
      finalImages = validImages;
    }
  }
  
  // Priority 2: Parse media_urls as JSON string (fallback format)
  if (finalImages.length === 0 && product.media_urls && typeof product.media_urls === 'string' && (product.media_urls as string).trim()) {
    try {
      const parsed = JSON.parse(product.media_urls);
      console.log('Successfully parsed media_urls JSON:', parsed);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validImages = parsed
          .filter(url => url && typeof url === 'string' && url.trim())
          .map(url => url.trim());
        
        if (validImages.length > 0) {
          console.log(`✅ Using ${validImages.length} images from parsed media_urls:`, validImages);
          finalImages = validImages;
        }
      }
    } catch (e) {
      console.warn('❌ Failed to parse media_urls JSON:', product.media_urls, 'Error:', e);
    }
  }
  
  // Priority 3: Fallback to image_url
  if (finalImages.length === 0 && product.image_url && product.image_url.trim()) {
    console.log('⚠️ Using image_url as fallback:', product.image_url);
    finalImages = [product.image_url.trim()];
  }
  
  // Final fallback to placeholder
  if (finalImages.length === 0) {
    console.warn('❌ No valid images found, using placeholder');
    finalImages = ['/placeholder.svg'];
  }

  console.log(`🎯 Final image array (${finalImages.length} images):`, finalImages);
  console.log('🔍 ISSUE DETECTION: If this shows 1 image for ASOS product, the media_urls is not being processed correctly');
  console.log('=== End Product Image URL Debug ===');
  
  return finalImages;
}