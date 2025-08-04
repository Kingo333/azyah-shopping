import { Product } from '@/types';

/**
 * Fallback mechanism for handling missing or incomplete product data
 */
export const createFallbackProduct = (productId?: string): Partial<Product> => ({
  id: productId || 'unknown',
  title: 'Product Title Unavailable',
  description: 'Product description not available.',
  price_cents: 0,
  currency: 'USD',
  media_urls: ['/placeholder.svg'],
  brand: {
    id: 'unknown',
    owner_user_id: 'unknown',
    name: 'Brand Unknown',
    slug: 'unknown',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  status: 'active' as const,
  stock_qty: 0,
  sku: 'N/A',
  category_slug: 'clothing' as const,
  tags: [],
  attributes: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

/**
 * Safely handles product data with fallbacks for missing fields
 */
export const sanitizeProduct = (product: any): Product => {
  if (!product) {
    return createFallbackProduct() as Product;
  }

  return {
    ...createFallbackProduct(product.id),
    ...product,
    title: product.title || 'Product Title Unavailable',
    description: product.description || 'Product description not available.',
    price_cents: product.price_cents || 0,
    currency: product.currency || 'USD',
    media_urls: Array.isArray(product.media_urls) && product.media_urls.length > 0 
      ? product.media_urls 
      : ['/placeholder.svg'],
    brand: product.brand || {
      id: 'unknown',
      owner_user_id: 'unknown',
      name: 'Brand Unknown',
      slug: 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    stock_qty: product.stock_qty || 0,
    attributes: product.attributes || {},
    tags: Array.isArray(product.tags) ? product.tags : []
  };
};

/**
 * Logs missing product data for QA monitoring
 */
export const logMissingData = async (productId: string, missingFields: string[]) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase.from('events').insert({
      event_type: 'missing_product_data',
      product_id: productId,
      event_data: {
        missing_fields: missingFields,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      }
    });
  } catch (error) {
    console.error('Failed to log missing product data:', error);
  }
};

/**
 * Validates product data and logs any missing required fields
 */
export const validateAndSanitizeProduct = async (product: any): Promise<Product> => {
  const missingFields: string[] = [];
  
  if (!product?.title) missingFields.push('title');
  if (!product?.price_cents) missingFields.push('price_cents');
  if (!product?.media_urls || product.media_urls.length === 0) missingFields.push('media_urls');
  if (!product?.brand) missingFields.push('brand');
  
  if (missingFields.length > 0 && product?.id) {
    await logMissingData(product.id, missingFields);
  }
  
  return sanitizeProduct(product);
};

/**
 * Formats price with currency symbol
 */
export const formatPrice = (cents: number, currency: string = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  } catch (error) {
    return `$${(cents / 100).toFixed(2)}`;
  }
};

/**
 * Safe image URL with fallback
 */
export const getSafeImageUrl = (urls: string[] | undefined, index: number = 0): string => {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return '/placeholder.svg';
  }
  
  const url = urls[index] || urls[0] || '/placeholder.svg';
  
  // Basic URL validation
  try {
    new URL(url);
    return url;
  } catch {
    // If URL is invalid, return placeholder
    return '/placeholder.svg';
  }
};