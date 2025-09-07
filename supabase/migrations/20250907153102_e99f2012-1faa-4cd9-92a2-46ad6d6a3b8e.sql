-- Fix security issues from the previous migration

-- 1. Fix the security definer view issue by creating a function instead
DROP VIEW IF EXISTS products_with_tryon;

CREATE OR REPLACE FUNCTION get_products_with_tryon(limit_count integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  title text,
  price_cents integer,
  currency character,
  media_urls jsonb,
  external_url text,
  ar_mesh_url text,
  brand_id uuid,
  sku text,
  category_slug category_type,
  subcategory_slug subcategory_type,
  status text,
  stock_qty integer,
  min_stock_alert integer,
  created_at timestamptz,
  updated_at timestamptz,
  description text,
  compare_at_price_cents integer,
  weight_grams integer,
  dimensions jsonb,
  tags text[],
  seo_title text,
  seo_description text,
  retailer_id uuid,
  is_external boolean,
  source text,
  source_vendor text,
  source_imported_at timestamptz,
  attributes jsonb,
  image_url text,
  gender gender_type,
  has_outfit boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.price_cents,
    p.currency,
    p.media_urls,
    p.external_url,
    p.ar_mesh_url,
    p.brand_id,
    p.sku,
    p.category_slug,
    p.subcategory_slug,
    p.status,
    p.stock_qty,
    p.min_stock_alert,
    p.created_at,
    p.updated_at,
    p.description,
    p.compare_at_price_cents,
    p.weight_grams,
    p.dimensions,
    p.tags,
    p.seo_title,
    p.seo_description,
    p.retailer_id,
    p.is_external,
    p.source,
    p.source_vendor,
    p.source_imported_at,
    p.attributes,
    p.image_url,
    p.gender,
    EXISTS(
      SELECT 1 FROM product_outfit_assets poa 
      WHERE poa.product_id = p.id
    ) as has_outfit
  FROM products p
  WHERE p.status = 'active'
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$;

-- 2. Create storage buckets for the new feature
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-outfits', 'product-outfits', true),
  ('tryon-persons', 'tryon-persons', false),
  ('tryon-results', 'tryon-results', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Create RLS policies for the new storage buckets

-- Product outfits bucket - public read, brand owners can upload
CREATE POLICY "Public can view product outfits"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-outfits');

CREATE POLICY "Brand owners can upload product outfits"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-outfits' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Brand owners can update product outfits"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-outfits' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Brand owners can delete product outfits"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-outfits' 
  AND auth.uid() IS NOT NULL
);

-- Tryon persons bucket - private, users can only access their own
CREATE POLICY "Users can manage their own person photos"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'tryon-persons' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Tryon results bucket - private, users can only access their own
CREATE POLICY "Users can manage their own tryon results"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'tryon-results' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);