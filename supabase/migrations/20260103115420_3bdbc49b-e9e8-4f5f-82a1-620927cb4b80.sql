-- Backfill default wardrobe items for existing shoppers who don't have any defaults
INSERT INTO wardrobe_items (
  user_id, image_url, image_bg_removed_url, category, 
  color, season, brand, tags, is_default, source
)
SELECT 
  u.id as user_id,
  d.image_url,
  d.image_bg_removed_url,
  d.category,
  d.color,
  d.season,
  d.brand,
  d.tags,
  true as is_default,
  'upload' as source
FROM users u
CROSS JOIN default_wardrobe_items d
WHERE u.role = 'shopper'
AND NOT EXISTS (
  SELECT 1 FROM wardrobe_items w 
  WHERE w.user_id = u.id AND w.is_default = true
);