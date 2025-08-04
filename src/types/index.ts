// Core types for Azyah platform

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'shopper' | 'brand' | 'retailer' | 'admin';
  bio?: string;
  socials?: Record<string, string>;
  website?: string;
  phone?: string;
  shipping_address?: Address;
  billing_address?: Address;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface UserPreferences {
  size_system?: 'US' | 'UK' | 'EU' | 'CM';
  favorite_colors?: string[];
  budget_range?: { min: number; max: number };
  style_preferences?: string[];
}

export interface Brand {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  bio?: string;
  socials?: Record<string, string>;
  website?: string;
  contact_email?: string;
  shipping_regions?: string[];
  created_at: string;
  updated_at: string;
}

export interface Retailer {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  bio?: string;
  socials?: Record<string, string>;
  website?: string;
  contact_email?: string;
  shipping_regions?: string[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  parent_id?: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface ProductAttributes {
  gender_target?: 'women' | 'men' | 'unisex' | 'kids';
  size_system?: 'US' | 'UK' | 'EU' | 'CM';
  size?: string;
  color_primary?: string;
  pattern?: 'solid' | 'floral' | 'striped' | 'polka' | 'geometric' | 'animal' | 'abstract';
  material?: string;
  occasion?: 'casual' | 'formal' | 'business' | 'evening' | 'bridal' | 'party' | 'athleisure' | 'beach' | 'Ramadan' | 'Eid';
  season?: 'SS' | 'FW' | 'Resort' | 'Holiday';
  style_tags?: string[];
}

export interface Product {
  id: string;
  brand_id: string;
  retailer_id?: string;
  sku: string;
  title: string;
  description?: string;
  price_cents: number;
  compare_at_price_cents?: number;
  currency: string;
  category_slug: string;
  subcategory_slug?: string;
  attributes: ProductAttributes;
  media_urls: string[];
  ar_mesh_url?: string;
  external_url?: string;
  stock_qty: number;
  min_stock_alert: number;
  status: 'active' | 'inactive' | 'archived' | 'out_of_stock';
  weight_grams?: number;
  dimensions?: Record<string, number>;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at: string;
  brand?: Brand;
  retailer?: Retailer;
}

export interface SwipeAction {
  id: number;
  user_id: string;
  product_id: string;
  action: 'right' | 'up' | 'left';
  session_id?: string;
  created_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  items?: WishlistItem[];
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  added_at: string;
  sort_order: number;
  product?: Product;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  size_variant?: string;
  color_variant?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  shipping_address?: Address;
  billing_address?: Address;
  payment_method?: Record<string, any>;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  product_snapshot?: Product;
  created_at: string;
}

export interface AffiliateLink {
  id: string;
  user_id: string;
  product_id: string;
  code: string;
  clicks: number;
  orders: number;
  revenue_cents: number;
  commission_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Event {
  id: number;
  user_id?: string;
  session_id?: string;
  event_type: string;
  event_data: Record<string, any>;
  product_id?: string;
  brand_id?: string;
  retailer_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  created_at: string;
}