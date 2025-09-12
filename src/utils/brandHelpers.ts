/**
 * Utility functions for safely extracting brand information from product objects
 */

interface ProductWithBrand {
  brand?: { name: string };
  brands?: { name: string };
  brand_name?: string;
  merchant_name?: string;
  retailer?: { name: string };
}

/**
 * Safely extracts brand name from a product object, handling various data structures
 * Returns the brand name or a fallback value
 */
export const getBrandName = (product: ProductWithBrand, fallback: string = 'Unknown Brand'): string => {
  // Check for brand.name (most common structure)
  if (product.brand?.name) {
    return product.brand.name;
  }
  
  // Check for brands.name (alternative structure)
  if (product.brands?.name) {
    return product.brands.name;
  }
  
  // Check for direct brand_name field
  if (product.brand_name) {
    return product.brand_name;
  }
  
  // Check for merchant_name (external products)
  if (product.merchant_name) {
    return product.merchant_name;
  }
  
  // Check for retailer.name (fallback)
  if (product.retailer?.name) {
    return product.retailer.name;
  }
  
  return fallback;
};

/**
 * Checks if a product has valid brand information
 */
export const hasBrandInfo = (product: ProductWithBrand): boolean => {
  return !!(
    product.brand?.name ||
    product.brands?.name ||
    product.brand_name ||
    product.merchant_name ||
    product.retailer?.name
  );
};

/**
 * Gets brand display name with appropriate fallback for UI display
 * Never returns hardcoded vendor names like 'ASOS'
 */
export const getBrandDisplayName = (product: ProductWithBrand): string => {
  return getBrandName(product, '');
};