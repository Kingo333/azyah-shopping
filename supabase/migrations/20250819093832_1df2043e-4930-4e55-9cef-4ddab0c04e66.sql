-- Add gender enum type
CREATE TYPE gender_type AS ENUM ('men', 'women', 'unisex', 'kids');

-- Add gender column to products table
ALTER TABLE products ADD COLUMN gender gender_type;

-- Remove men and women from category_type enum
ALTER TYPE category_type RENAME TO category_type_old;
CREATE TYPE category_type AS ENUM ('clothing', 'footwear', 'accessories', 'jewelry', 'beauty', 'bags', 'modestwear', 'kids', 'fragrance', 'home', 'giftcards');

-- Update products table to use new category_type
ALTER TABLE products ALTER COLUMN category_slug TYPE category_type USING category_slug::text::category_type;

-- Remove gender-specific subcategories from subcategory_type enum
ALTER TYPE subcategory_type RENAME TO subcategory_type_old;
CREATE TYPE subcategory_type AS ENUM (
  'dresses', 'abayas', 'tops', 'blouses', 'shirts', 't-shirts', 'sweaters',
  'jackets', 'coats', 'blazers', 'cardigans', 'trousers', 'jeans', 'skirts',
  'shorts', 'activewear', 'loungewear', 'sleepwear', 'swimwear', 'lingerie',
  'heels', 'flats', 'sandals', 'sneakers', 'boots', 'loafers', 'slippers',
  'belts', 'scarves', 'hats', 'sunglasses', 'watches',
  'necklaces', 'earrings', 'bracelets', 'rings', 'anklets', 'brooches',
  'all beauty', 'skincare', 'haircare', 'makeup', 'fragrances', 'home fragrances', 'tools & accessories',
  'handbags', 'clutches', 'totes', 'backpacks', 'wallets',
  'hijabs', 'niqabs', 'jilbabs', 'kaftans',
  'baby clothing', 'girls clothing', 'boys clothing', 'kids footwear', 'kids accessories',
  'oriental', 'floral', 'woody', 'citrus', 'gourmand', 'oud',
  'scented candles', 'diffusers', 'room sprays', 'fashion books',
  'digital gift card', 'physical voucher'
);

-- Update products table to use new subcategory_type
ALTER TABLE products ALTER COLUMN subcategory_slug TYPE subcategory_type USING subcategory_slug::text::subcategory_type;

-- Update the validation function for new category system
CREATE OR REPLACE FUNCTION public.validate_category_subcategory(cat category_type, subcat subcategory_type)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN CASE cat
        WHEN 'clothing' THEN subcat IN ('dresses', 'abayas', 'tops', 'blouses', 'shirts', 't-shirts', 'sweaters', 'jackets', 'coats', 'blazers', 'cardigans', 'trousers', 'jeans', 'skirts', 'shorts', 'activewear', 'loungewear', 'sleepwear', 'swimwear', 'lingerie')
        WHEN 'footwear' THEN subcat IN ('heels', 'flats', 'sandals', 'sneakers', 'boots', 'loafers', 'slippers')
        WHEN 'accessories' THEN subcat IN ('belts', 'scarves', 'hats', 'sunglasses', 'watches')
        WHEN 'jewelry' THEN subcat IN ('necklaces', 'earrings', 'bracelets', 'rings', 'anklets', 'brooches')
        WHEN 'beauty' THEN subcat IN ('all beauty', 'skincare', 'haircare', 'makeup', 'fragrances', 'home fragrances', 'tools & accessories')
        WHEN 'bags' THEN subcat IN ('handbags', 'clutches', 'totes', 'backpacks', 'wallets')
        WHEN 'modestwear' THEN subcat IN ('abayas', 'hijabs', 'niqabs', 'jilbabs', 'kaftans')
        WHEN 'kids' THEN subcat IN ('baby clothing', 'girls clothing', 'boys clothing', 'kids footwear', 'kids accessories')
        WHEN 'fragrance' THEN subcat IN ('oriental', 'floral', 'woody', 'citrus', 'gourmand', 'oud')
        WHEN 'home' THEN subcat IN ('scented candles', 'diffusers', 'room sprays', 'fashion books')
        WHEN 'giftcards' THEN subcat IN ('digital gift card', 'physical voucher')
        ELSE FALSE
    END;
END;
$function$;

-- Drop old enum types
DROP TYPE category_type_old;
DROP TYPE subcategory_type_old;

-- Set default gender for existing products based on category analysis
UPDATE products 
SET gender = CASE
  WHEN title ILIKE '%men%' OR title ILIKE '%male%' OR title ILIKE '%boy%' THEN 'men'::gender_type
  WHEN title ILIKE '%women%' OR title ILIKE '%female%' OR title ILIKE '%girl%' OR title ILIKE '%lady%' OR title ILIKE '%ladies%' THEN 'women'::gender_type
  WHEN title ILIKE '%kid%' OR title ILIKE '%child%' OR title ILIKE '%baby%' THEN 'kids'::gender_type
  ELSE 'unisex'::gender_type
END
WHERE gender IS NULL;