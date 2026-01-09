// Utility functions for handling product images, especially ASOS products
// Note: URL conversion happens in displaySrc() - keep raw URLs here

import { logger } from '@/utils/logger';

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
        logger.log('ASOS product - all images extracted:', product.id, 'Total:', parsed.length);
        parsed.forEach((url: string, index: number) => {
          if (url && typeof url === 'string' && url.trim()) {
            images.push({
              url: url.trim(),
              index,
              isAsos: url.includes('asos-media.com')
            });
          }
        });
      }
    } catch (e) {
      logger.warn('Failed to parse media_urls:', product.media_urls);
    }
  }

  // Handle media_urls as array
  if (images.length === 0 && product.media_urls && Array.isArray(product.media_urls)) {
    product.media_urls.forEach((url: string, index: number) => {
      if (url && typeof url === 'string' && url.trim()) {
        images.push({
          url: url.trim(),
          index,
          isAsos: url.includes('asos-media.com')
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
    logger.log(`ASOS product ${product.id} has ${images.length} images available for gallery`);
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
  if (!product) {
    logger.warn('getProductImageUrls: No product provided');
    return ['/placeholder.svg'];
  }

  logger.debug('=== Production Image Debug ===');
  logger.debug('Product ID:', product?.id);
  logger.debug('Brand:', product?.brand?.name || product?.brands?.name || product?.merchant_name);
  
  let finalImages: string[] = [];
  
  // Priority 1: Use media_urls as array (PRIMARY format from Supabase JSONB)
  if (Array.isArray(product.media_urls) && product.media_urls.length > 0) {
    const validImages = product.media_urls
      .filter(url => url && typeof url === 'string' && url.trim())
      .map(url => url.trim());
    
    if (validImages.length > 0) {
      logger.debug(`✅ Using ${validImages.length} images from media_urls array`);
      finalImages = validImages;
    }
  }
  
  // Priority 2: Parse media_urls as JSON string (fallback format)
  if (finalImages.length === 0 && product.media_urls && typeof product.media_urls === 'string' && (product.media_urls as string).trim()) {
    try {
      const parsed = JSON.parse(product.media_urls);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validImages = parsed
          .filter(url => url && typeof url === 'string' && url.trim())
          .map(url => url.trim());
        
        if (validImages.length > 0) {
          logger.debug(`✅ Using ${validImages.length} images from parsed media_urls`);
          finalImages = validImages;
        }
      }
    } catch (e) {
      logger.warn('❌ Failed to parse media_urls JSON');
    }
  }
  
  // Priority 3: Fallback to image_url
  if (finalImages.length === 0 && product.image_url && product.image_url.trim()) {
    logger.debug('⚠️ Using image_url as fallback');
    finalImages = [product.image_url.trim()];
  }
  
  // Final fallback to placeholder
  if (finalImages.length === 0) {
    logger.warn('❌ No valid images found, using placeholder');
    finalImages = ['/placeholder.svg'];
  }

  logger.debug(`🎯 Final: ${finalImages.length} images`);
  
  return finalImages;
}