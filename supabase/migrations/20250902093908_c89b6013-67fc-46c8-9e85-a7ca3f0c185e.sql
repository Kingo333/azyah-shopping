-- Fix sneakers/footwear
UPDATE products 
SET category_slug = 'footwear', subcategory_slug = 'sneakers'
WHERE (title ILIKE '%sneaker%' OR title ILIKE '%nike air%' OR title ILIKE '%nike shox%')
  AND category_slug = 'clothing';

-- Fix dresses
UPDATE products 
SET subcategory_slug = 'dresses'
WHERE title ILIKE '%dress%' 
  AND category_slug = 'clothing' 
  AND subcategory_slug = 'tops';

-- Fix shirts 
UPDATE products 
SET subcategory_slug = 'shirts'
WHERE (title ILIKE '%shirt%' AND title NOT ILIKE '%t-shirt%' AND title NOT ILIKE '%tshirt%')
  AND category_slug = 'clothing' 
  AND subcategory_slug = 'tops';

-- Fix hoodies/sweaters
UPDATE products 
SET subcategory_slug = 'sweaters'
WHERE (title ILIKE '%hoodie%' OR title ILIKE '%sweatshirt%')
  AND category_slug = 'clothing' 
  AND subcategory_slug = 'tops';