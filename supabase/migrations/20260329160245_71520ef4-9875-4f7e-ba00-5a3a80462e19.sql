ALTER TABLE public.event_brand_products
ADD COLUMN IF NOT EXISTS garment_type TEXT NOT NULL DEFAULT 'shirt'
CHECK (garment_type IN ('shirt', 'abaya', 'pants', 'jacket', 'headwear', 'accessory'));

COMMENT ON COLUMN public.event_brand_products.garment_type IS
  'Type of garment for AR anchor strategy selection.';