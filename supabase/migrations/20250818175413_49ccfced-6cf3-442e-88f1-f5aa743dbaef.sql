-- Add missing columns to products table for external source tracking
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS source_vendor text,
ADD COLUMN IF NOT EXISTS source_imported_at timestamp with time zone;

-- Create index for efficient querying of external products
CREATE INDEX IF NOT EXISTS idx_products_external_source ON public.products(is_external, source) WHERE is_external = true;