-- Update affiliate_links table structure
ALTER TABLE public.affiliate_links 
DROP COLUMN IF EXISTS code,
DROP COLUMN IF EXISTS product_id;

-- Add missing columns
ALTER TABLE public.affiliate_links 
ADD COLUMN IF NOT EXISTS brand_name text NOT NULL DEFAULT 'Brand',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS affiliate_url text NOT NULL DEFAULT 'https://example.com',
ADD COLUMN IF NOT EXISTS expiry_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Remove default constraints after adding columns
ALTER TABLE public.affiliate_links 
ALTER COLUMN brand_name DROP DEFAULT,
ALTER COLUMN affiliate_url DROP DEFAULT;