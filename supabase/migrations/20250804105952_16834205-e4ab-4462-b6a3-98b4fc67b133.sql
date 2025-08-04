-- Create a default brand for unbranded products
INSERT INTO brands (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Unbranded',
  'unbranded', 
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update products with null brand_id to use the default brand
UPDATE products 
SET brand_id = '00000000-0000-0000-0000-000000000000'
WHERE brand_id IS NULL;