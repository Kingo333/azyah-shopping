/**
 * Utility functions for consistent product data querying
 * Ensures all product queries include necessary fields for proper image display
 */

// Standard product fields that should always be included in queries
export const PRODUCT_SELECT_FIELDS = `
  id,
  title,
  image_url,
  media_urls,
  price_cents,
  currency,
  external_url,
  category_slug,
  subcategory_slug,
  status,
  brand_id,
  retailer_id,
  created_at,
  updated_at
`;

// Product fields with brand and retailer relationships
export const PRODUCT_SELECT_WITH_RELATIONS = `
  ${PRODUCT_SELECT_FIELDS},
  brands:brand_id(name, slug),
  retailers:retailer_id(name, slug)
`;

/**
 * Maps raw product data from database to ensure consistent structure
 * Includes fallbacks for missing fields and proper media_urls handling
 */
export function mapProductData(product: any): any {
  return {
    ...product,
    image_url: product.image_url || '/placeholder.svg',
    media_urls: product.media_urls || [],
    currency: product.currency || 'USD',
    brand_name: product.brands?.name || product.retailers?.name || '',
    brand_slug: product.brands?.slug || product.retailers?.slug || '',
    price_cents: product.price_cents || 0,
  };
}

/**
 * Type for consistent product interface used across components
 */
export interface StandardProduct {
  id: string;
  title: string;
  image_url: string;
  media_urls?: any; // Array of image URLs or stringified JSON
  price_cents: number;
  currency: string;
  external_url: string | null;
  category_slug?: string;
  subcategory_slug?: string;
  brand_name?: string;
  brand_slug?: string;
  brand_id?: string;
  retailer_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}