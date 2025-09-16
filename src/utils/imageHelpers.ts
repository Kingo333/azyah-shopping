// Utility functions for handling product images, especially ASOS products
import { imageUrlFrom, extractSupabasePath } from '../lib/imageUrl';
import { isSupabaseAbsoluteUrl } from '../lib/urlGuards';

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
            let processedUrl = url.trim();
            
            // Convert absolute Supabase URLs to environment-aware URLs
            if (isSupabaseAbsoluteUrl(processedUrl)) {
              const pathData = extractSupabasePath(processedUrl);
              if (pathData) {
                processedUrl = imageUrlFrom(pathData.bucket, pathData.path);
              }
            }
            
            images.push({
              url: processedUrl,
              index,
              isAsos: url.includes('asos-media.com')
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
        let processedUrl = url.trim();
        
        // Convert absolute Supabase URLs to environment-aware URLs
        if (isSupabaseAbsoluteUrl(processedUrl)) {
          const pathData = extractSupabasePath(processedUrl);
          if (pathData) {
            processedUrl = imageUrlFrom(pathData.bucket, pathData.path);
          }
        }
        
        images.push({
          url: processedUrl,
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
  if (!product) {
    console.warn('getProductImageUrls: No product provided');
    return ['/placeholder.svg'];
  }

  console.log('=== Production Image Debug ===');
  console.log('Product ID:', product?.id);
  console.log('Brand:', product?.brand?.name || product?.brands?.name || product?.merchant_name);
  console.log('media_urls type:', typeof product?.media_urls);
  console.log('media_urls value:', product?.media_urls);
  console.log('image_url:', product?.image_url);
  
  let finalImages: string[] = [];
  
  // Priority 1: Use media_urls as array (PRIMARY format from Supabase JSONB)
  if (Array.isArray(product.media_urls) && product.media_urls.length > 0) {
    const validImages = product.media_urls
      .filter(url => url && typeof url === 'string' && url.trim())
      .map(url => {
        let processedUrl = url.trim();
        
        // Handle relative Supabase paths that don't start with https://
        if (!processedUrl.startsWith('https://') && processedUrl.includes('/')) {
          // This is likely a relative Supabase path like "product-images/bucket/file.png"
          const parts = processedUrl.split('/');
          if (parts.length >= 2) {
            const bucket = parts[0];
            const path = parts.slice(1).join('/');
            processedUrl = imageUrlFrom(bucket, path);
            console.log('🔧 Converting relative path:', url, '→', processedUrl);
          }
        }
        // Convert absolute Supabase URLs to environment-aware URLs
        else if (isSupabaseAbsoluteUrl(processedUrl)) {
          const pathData = extractSupabasePath(processedUrl);
          if (pathData) {
            processedUrl = imageUrlFrom(pathData.bucket, pathData.path);
          }
        }
        
        return processedUrl;
      });
    
    if (validImages.length > 0) {
      console.log(`✅ PRODUCTION: Using ${validImages.length} images from media_urls array for ${product?.brand?.name || 'Unknown'}:`, validImages);
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
          .map(url => {
            let processedUrl = url.trim();
            
            // Convert absolute Supabase URLs to environment-aware URLs
            if (isSupabaseAbsoluteUrl(processedUrl)) {
              const pathData = extractSupabasePath(processedUrl);
              if (pathData) {
                processedUrl = imageUrlFrom(pathData.bucket, pathData.path);
              }
            }
            
            return processedUrl;
          });
        
        if (validImages.length > 0) {
          console.log(`✅ PRODUCTION: Using ${validImages.length} images from parsed media_urls for ${product?.brand?.name || 'Unknown'}:`, validImages);
          finalImages = validImages;
        }
      }
    } catch (e) {
      console.warn('❌ PRODUCTION: Failed to parse media_urls JSON:', product.media_urls, 'Error:', e);
    }
  }
  
  // Priority 3: Fallback to image_url
  if (finalImages.length === 0 && product.image_url && product.image_url.trim()) {
    console.log('⚠️ PRODUCTION: Using image_url as fallback for', product?.brand?.name || 'Unknown', ':', product.image_url);
    finalImages = [product.image_url.trim()];
  }
  
  // Final fallback to placeholder
  if (finalImages.length === 0) {
    console.warn('❌ PRODUCTION: No valid images found for', product?.brand?.name || 'Unknown', ', using placeholder');
    finalImages = ['/placeholder.svg'];
  }

  console.log(`🎯 PRODUCTION FINAL: ${finalImages.length} images for ${product?.brand?.name || 'Unknown'}:`, finalImages);
  console.log('=== End Production Image Debug ===');
  
  return finalImages;
}