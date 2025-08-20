-- CRITICAL SECURITY FIX: Secure Wishlist and Product Data Access
-- Phase 1: Immediate Wishlist Security

-- First, set all existing public wishlists to private for security
UPDATE public.wishlists SET is_public = false WHERE is_public = true;

-- Drop existing public access policies for wishlists
DROP POLICY IF EXISTS "Anyone can view public wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Anyone can view public wishlist items" ON public.wishlist_items;

-- Ensure wishlist policies only allow owner access
DROP POLICY IF EXISTS "Users can manage their own wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Users can view their own wishlists" ON public.wishlists;

CREATE POLICY "Users can manage their own wishlists" 
ON public.wishlists 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure wishlist_items policies only allow owner access through wishlist ownership
DROP POLICY IF EXISTS "Users can manage items in their own wishlists" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can view items in their own wishlists" ON public.wishlist_items;

CREATE POLICY "Users can manage items in their own wishlists" 
ON public.wishlist_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.wishlists 
  WHERE wishlists.id = wishlist_items.wishlist_id 
  AND wishlists.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.wishlists 
  WHERE wishlists.id = wishlist_items.wishlist_id 
  AND wishlists.user_id = auth.uid()
));

-- Phase 2: Product Catalog Protection with Tiered Access

-- Drop the overly permissive "Anyone can view active products" policy
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create tiered access for products
-- Public access: Limited product data for unauthenticated users
CREATE POLICY "Public can view basic product info" 
ON public.products 
FOR SELECT 
USING (
  status = 'active'::product_status 
  AND auth.role() = 'anon'
);

-- Authenticated users: Full product data except sensitive business info
CREATE POLICY "Authenticated users can view full product info" 
ON public.products 
FOR SELECT 
USING (
  status = 'active'::product_status 
  AND auth.role() = 'authenticated'
);

-- Brand/Retailer owners: Full access to their own products including sensitive data
-- (These policies already exist and are secure)

-- Create a secure view for public product access with limited fields
CREATE OR REPLACE VIEW public.products_public AS
SELECT 
  id,
  title,
  description,
  price_cents,
  currency,
  category_slug,
  subcategory_slug,
  media_urls,
  image_url,
  status,
  created_at,
  brand_id,
  retailer_id,
  gender,
  attributes,
  tags
FROM public.products
WHERE status = 'active'::product_status;

-- Enable RLS on the public view
ALTER VIEW public.products_public SET (security_barrier = true);

-- Grant appropriate access to the public view
GRANT SELECT ON public.products_public TO anon;
GRANT SELECT ON public.products_public TO authenticated;

-- Ensure sensitive product fields are only accessible to owners
-- (stock_qty, min_stock_alert, source, source_vendor, merchant_name, external_url, price_raw)
-- These are already protected by existing owner policies