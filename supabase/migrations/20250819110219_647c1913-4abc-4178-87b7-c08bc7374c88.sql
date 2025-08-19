-- Fix ASOS product categorization using proper enum casting
-- Update products based on title analysis

-- Update footwear products
UPDATE products 
SET category_slug = 'footwear'::category_type,
    subcategory_slug = CASE
      WHEN title ILIKE '%sneaker%' OR title ILIKE '%trainer%' THEN 'sneakers'::subcategory_type
      WHEN title ILIKE '%heel%' OR title ILIKE '%pump%' THEN 'heels'::subcategory_type
      WHEN title ILIKE '%boot%' THEN 'boots'::subcategory_type
      WHEN title ILIKE '%sandal%' THEN 'sandals'::subcategory_type
      WHEN title ILIKE '%flat%' OR title ILIKE '%ballet%' THEN 'flats'::subcategory_type
      WHEN title ILIKE '%loafer%' OR title ILIKE '%oxford%' THEN 'loafers'::subcategory_type
      WHEN title ILIKE '%slipper%' THEN 'slippers'::subcategory_type
      ELSE 'sneakers'::subcategory_type
    END,
    updated_at = NOW()
WHERE category_slug = 'clothing'::category_type 
  AND subcategory_slug = 'tops'::subcategory_type
  AND (title ILIKE '%shoe%' OR title ILIKE '%boot%' OR title ILIKE '%sneaker%' OR title ILIKE '%trainer%' 
       OR title ILIKE '%sandal%' OR title ILIKE '%heel%' OR title ILIKE '%flat%' OR title ILIKE '%loafer%' 
       OR title ILIKE '%slipper%' OR title ILIKE '%pump%');