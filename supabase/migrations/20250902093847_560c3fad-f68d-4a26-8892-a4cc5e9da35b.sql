-- Fix bags first (move from clothing to bags category)
UPDATE products 
SET category_slug = 'bags', subcategory_slug = 'handbags'
WHERE (title ILIKE '%bag%' OR title ILIKE '%tote%' OR title ILIKE '%shoulder bag%')
  AND category_slug = 'clothing';