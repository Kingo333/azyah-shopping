-- Add currency column to brands table with AED default
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'AED';

-- Create brand_portfolios table for past work
CREATE TABLE IF NOT EXISTS brand_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_brand_portfolios_brand_id ON brand_portfolios(brand_id);

-- Enable RLS
ALTER TABLE brand_portfolios ENABLE ROW LEVEL SECURITY;

-- Public can view portfolios
CREATE POLICY "Public can view portfolios" ON brand_portfolios
  FOR SELECT USING (true);

-- Brand owners can insert their own portfolios
CREATE POLICY "Owners can insert portfolios" ON brand_portfolios
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM brands WHERE id = brand_id AND owner_user_id = auth.uid())
  );

-- Brand owners can update their own portfolios
CREATE POLICY "Owners can update portfolios" ON brand_portfolios
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM brands WHERE id = brand_id AND owner_user_id = auth.uid())
  );

-- Brand owners can delete their own portfolios
CREATE POLICY "Owners can delete portfolios" ON brand_portfolios
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM brands WHERE id = brand_id AND owner_user_id = auth.uid())
  );