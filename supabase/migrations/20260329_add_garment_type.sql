-- Migration: Add garment_type to event_brand_products
-- Requirement: RETL-01 (add column), RETL-04 (default to 'shirt' for existing rows)
-- Enum values per REQUIREMENTS.md: shirt, abaya, pants, jacket, headwear, accessory

ALTER TABLE public.event_brand_products
ADD COLUMN garment_type TEXT NOT NULL DEFAULT 'shirt'
CHECK (garment_type IN ('shirt', 'abaya', 'pants', 'jacket', 'headwear', 'accessory'));

COMMENT ON COLUMN public.event_brand_products.garment_type IS
  'Type of garment for AR anchor strategy selection. Determines which landmarks and scaling to use.';
