-- Update wardrobe_items category constraint to match user requirements
ALTER TABLE wardrobe_items 
DROP CONSTRAINT IF EXISTS wardrobe_items_category_check;

ALTER TABLE wardrobe_items
ADD CONSTRAINT wardrobe_items_category_check 
CHECK (category IN ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'));