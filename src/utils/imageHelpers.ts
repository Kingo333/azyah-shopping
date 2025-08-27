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