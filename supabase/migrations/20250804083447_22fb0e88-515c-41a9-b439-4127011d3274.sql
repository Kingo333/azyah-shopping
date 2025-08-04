-- Add external_url field to products table for shop links
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Update products with some sample external URLs for testing
UPDATE products 
SET external_url = CASE 
  WHEN brand_id IS NOT NULL THEN 'https://example-brand.com/product/' || id
  ELSE 'https://example-retailer.com/product/' || id
END
WHERE external_url IS NULL;

-- Add index for external_url lookups
CREATE INDEX IF NOT EXISTS idx_products_external_url ON products(external_url) WHERE external_url IS NOT NULL;