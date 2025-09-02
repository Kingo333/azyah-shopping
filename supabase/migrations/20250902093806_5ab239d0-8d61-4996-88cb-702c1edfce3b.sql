-- Fix obvious category mismatches based on product names

-- Fix dresses that are categorized as "tops" instead of "dresses"
UPDATE products 
SET subcategory_slug = 'dresses'
WHERE title ILIKE '%dress%' 
  AND category_slug = 'clothing' 
  AND subcategory_slug = 'tops';

-- Fix sneakers/shoes that are categorized as "clothing" instead of "footwear"
UPDATE products 
SET category_slug = 'footwear', subcategory_slug = 'sneakers'
WHERE (title ILIKE '%sneaker%' OR title ILIKE '%nike air%' OR title ILIKE '%nike shox%')
  AND category_slug = 'clothing';

-- Fix bags that are categorized as "clothing" instead of "bags"
UPDATE products 
SET category_slug = 'bags'
WHERE (title ILIKE '%bag%' OR title ILIKE '%tote%' OR title ILIKE '%shoulder bag%')
  AND category_slug = 'clothing';

-- Update bags subcategories more specifically
UPDATE products 
SET subcategory_slug = 'totes'
WHERE title ILIKE '%tote%' 
  AND category_slug = 'bags';

UPDATE products 
SET subcategory_slug = 'handbags'
WHERE (title ILIKE '%shoulder bag%' OR title ILIKE '%scoop bag%')
  AND category_slug = 'bags';

-- Fix hoodies and sweatshirts that should be in sweaters/cardigans
UPDATE products 
SET subcategory_slug = 'sweaters'
WHERE (title ILIKE '%hoodie%' OR title ILIKE '%sweatshirt%' OR title ILIKE '%sweatpants%')
  AND category_slug = 'clothing' 
  AND subcategory_slug = 'tops';

-- Fix shirts that should be properly categorized as shirts
UPDATE products 
SET subcategory_slug = 'shirts'
WHERE (title ILIKE '%shirt%' AND title NOT ILIKE '%t-shirt%' AND title NOT ILIKE '%tshirt%')
  AND category_slug = 'clothing' 
  AND subcategory_slug = 'tops';

-- Fix t-shirts
UPDATE products 
SET subcategory_slug = 't-shirts'
WHERE (title ILIKE '%t-shirt%' OR title ILIKE '%tshirt%' OR title ILIKE '%tee%')
  AND category_slug = 'clothing';

-- Fix trousers/pants
UPDATE products 
SET subcategory_slug = 'trousers'
WHERE (title ILIKE '%trouser%' OR title ILIKE '%pant%' OR title ILIKE '%sweatpants%')
  AND category_slug = 'clothing';

-- Update gender for women's products
UPDATE products 
SET gender = 'women'
WHERE (title ILIKE '%women%' OR title ILIKE '%topshop%' OR title ILIKE '%dress%')
  AND gender IS NULL;