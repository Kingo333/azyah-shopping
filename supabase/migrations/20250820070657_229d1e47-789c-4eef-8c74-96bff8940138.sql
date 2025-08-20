-- Update NULL subcategories directly without trigger interference
UPDATE products 
SET subcategory_slug = 'necklaces'
WHERE category_slug = 'jewelry' AND subcategory_slug IS NULL;

UPDATE products 
SET subcategory_slug = 'abayas'
WHERE category_slug = 'modestwear' AND subcategory_slug IS NULL;