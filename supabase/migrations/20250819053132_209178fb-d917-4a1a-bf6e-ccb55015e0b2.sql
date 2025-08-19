-- Create ASOS brand for external products
INSERT INTO brands (name, slug, logo_url, bio, created_at, updated_at)
VALUES (
  'ASOS',
  'asos',
  'https://images.asos-media.com/navigation/asos-face-logo',
  'ASOS plc is a British online fashion and cosmetic retailer.',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Extract brand names from external products and create brands
WITH extracted_brands AS (
  SELECT DISTINCT 
    COALESCE(merchant_name, 'ASOS') as brand_name,
    LOWER(REPLACE(COALESCE(merchant_name, 'ASOS'), ' ', '-')) as brand_slug
  FROM products 
  WHERE is_external = true 
    AND brand_id IS NULL 
    AND merchant_name IS NOT NULL
),
new_brands AS (
  INSERT INTO brands (name, slug, created_at, updated_at)
  SELECT 
    brand_name,
    brand_slug,
    NOW(),
    NOW()
  FROM extracted_brands
  WHERE brand_slug NOT IN (SELECT slug FROM brands)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug
)
-- Update products to link with their brands
UPDATE products 
SET brand_id = b.id
FROM brands b
WHERE products.is_external = true 
  AND products.brand_id IS NULL
  AND LOWER(REPLACE(COALESCE(products.merchant_name, 'ASOS'), ' ', '-')) = b.slug;

-- For products without merchant_name, assign to ASOS brand
UPDATE products 
SET brand_id = b.id
FROM brands b
WHERE products.is_external = true 
  AND products.brand_id IS NULL
  AND b.slug = 'asos';