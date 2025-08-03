import { Json } from '@/integrations/supabase/types';
import { ProductAttributes, Brand, Retailer } from '@/types';

// Type conversion utilities for Supabase Json to our custom types
export const convertJsonToProductAttributes = (json: Json): ProductAttributes => {
  if (!json || typeof json !== 'object' || json === null) {
    return {} as ProductAttributes;
  }
  
  return json as ProductAttributes;
};

// Type guard for ProductAttributes
export const isValidProductAttributes = (value: any): value is ProductAttributes => {
  return value && typeof value === 'object';
};

// Convert Supabase product to our Product type
export const convertSupabaseProduct = (supabaseProduct: any): any => {
  return {
    ...supabaseProduct,
    attributes: convertJsonToProductAttributes(supabaseProduct.attributes),
  };
};

// Create a minimal Brand for search results
export const createMinimalBrand = (id: string, name: string, logo_url?: string): Brand => {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    logo_url: logo_url || null,
    cover_image_url: null,
    bio: null,
    website: null,
    contact_email: null,
    shipping_regions: [],
    socials: {},
    owner_user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};