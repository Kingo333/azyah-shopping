-- Add 'discover' to the allowed source values for wardrobe_items
ALTER TABLE wardrobe_items 
DROP CONSTRAINT IF EXISTS wardrobe_items_source_check;

ALTER TABLE wardrobe_items 
ADD CONSTRAINT wardrobe_items_source_check 
CHECK (source = ANY (ARRAY['upload'::text, 'web_import'::text, 'community_copy'::text, 'discover'::text]));