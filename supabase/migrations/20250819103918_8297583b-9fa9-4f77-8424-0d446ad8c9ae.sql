-- Add gender enum type
CREATE TYPE gender_type AS ENUM ('men', 'women', 'unisex', 'kids');

-- Add gender column to products table
ALTER TABLE products ADD COLUMN gender gender_type;

-- Set default gender for existing products first
UPDATE products 
SET gender = CASE
  WHEN title ILIKE '%men%' OR title ILIKE '%male%' OR title ILIKE '%boy%' THEN 'men'::gender_type
  WHEN title ILIKE '%women%' OR title ILIKE '%female%' OR title ILIKE '%girl%' OR title ILIKE '%lady%' OR title ILIKE '%ladies%' THEN 'women'::gender_type
  WHEN title ILIKE '%kid%' OR title ILIKE '%child%' OR title ILIKE '%baby%' THEN 'kids'::gender_type
  ELSE 'unisex'::gender_type
END
WHERE gender IS NULL;

-- Update existing products that are categorized as 'men' or 'women' to 'clothing' category
-- and set their gender appropriately
UPDATE products 
SET 
  category_slug = 'clothing'::category_type,
  gender = CASE 
    WHEN category_slug = 'men' THEN 'men'::gender_type
    WHEN category_slug = 'women' THEN 'women'::gender_type
    ELSE gender
  END
WHERE category_slug IN ('men', 'women');