-- Phase 1: StyleLink Creator Storefront Database Setup

-- 1. Add visibility column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public_explore';

COMMENT ON COLUMN public.posts.visibility IS 'Controls where post appears: public_explore (StyleLink + Explore), stylelink_only, private';

-- 2. Extend post_products for external links and tap-to-tag
ALTER TABLE public.post_products 
ADD COLUMN IF NOT EXISTS external_url TEXT,
ADD COLUMN IF NOT EXISTS external_title TEXT,
ADD COLUMN IF NOT EXISTS external_image_url TEXT,
ADD COLUMN IF NOT EXISTS external_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS external_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS external_brand_name TEXT,
ADD COLUMN IF NOT EXISTS external_brand_logo_url TEXT,
ADD COLUMN IF NOT EXISTS position_x DECIMAL,
ADD COLUMN IF NOT EXISTS position_y DECIMAL,
ADD COLUMN IF NOT EXISTS label TEXT;

COMMENT ON COLUMN public.post_products.position_x IS 'X coordinate for tap-to-tag (0-1 normalized)';
COMMENT ON COLUMN public.post_products.position_y IS 'Y coordinate for tap-to-tag (0-1 normalized)';
COMMENT ON COLUMN public.post_products.label IS 'Custom label for tagged product (e.g., bag, dress)';

-- 3. Create creator_products table for curated products
CREATE TABLE IF NOT EXISTS public.creator_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_url TEXT,
  external_title TEXT,
  external_image_url TEXT,
  external_price_cents INTEGER,
  external_currency TEXT DEFAULT 'USD',
  external_brand_name TEXT,
  external_brand_logo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_has_product_or_external CHECK (product_id IS NOT NULL OR external_url IS NOT NULL)
);

-- Create indexes for creator_products
CREATE INDEX IF NOT EXISTS idx_creator_products_user_id ON public.creator_products(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_products_sort ON public.creator_products(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_creator_products_featured ON public.creator_products(user_id, is_featured) WHERE is_featured = true;

-- 4. Enable RLS on creator_products
ALTER TABLE public.creator_products ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for creator_products
-- Public can read all creator products
CREATE POLICY "Public can read creator products" 
ON public.creator_products
FOR SELECT 
USING (true);

-- Users can insert their own creator products
CREATE POLICY "Users can insert own creator products" 
ON public.creator_products
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own creator products
CREATE POLICY "Users can update own creator products" 
ON public.creator_products
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own creator products
CREATE POLICY "Users can delete own creator products" 
ON public.creator_products
FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Create trigger for updated_at on creator_products
CREATE TRIGGER update_creator_products_updated_at
BEFORE UPDATE ON public.creator_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();