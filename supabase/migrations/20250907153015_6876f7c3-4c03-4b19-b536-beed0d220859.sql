-- Create product outfit assets table for brands to upload one outfit per product
CREATE TABLE IF NOT EXISTS product_outfit_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  outfit_image_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE product_outfit_assets ENABLE ROW LEVEL SECURITY;

-- Brand owners can manage their product outfits
CREATE POLICY "Brand owners can manage their product outfits"
ON product_outfit_assets
FOR ALL
USING (EXISTS(
  SELECT 1 FROM brands b 
  WHERE b.id = product_outfit_assets.brand_id 
  AND b.owner_user_id = auth.uid()
));

-- Function to enforce 5 product limit per brand
CREATE OR REPLACE FUNCTION enforce_outfit_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM product_outfit_assets WHERE brand_id = NEW.brand_id) >= 5 THEN
    RAISE EXCEPTION 'Try-on limit reached: maximum 5 products per brand';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to enforce the limit
DROP TRIGGER IF EXISTS trg_enforce_outfit_limit ON product_outfit_assets;
CREATE TRIGGER trg_enforce_outfit_limit
  BEFORE INSERT ON product_outfit_assets
  FOR EACH ROW EXECUTE FUNCTION enforce_outfit_limit();

-- View to add has_outfit flag to products for UI
CREATE OR REPLACE VIEW products_with_tryon AS
SELECT 
  p.*,
  EXISTS(
    SELECT 1 FROM product_outfit_assets poa 
    WHERE poa.product_id = p.id
  ) as has_outfit
FROM products p;

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_product_outfit_assets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_product_outfit_assets_updated_at
  BEFORE UPDATE ON product_outfit_assets
  FOR EACH ROW EXECUTE FUNCTION update_product_outfit_assets_updated_at();