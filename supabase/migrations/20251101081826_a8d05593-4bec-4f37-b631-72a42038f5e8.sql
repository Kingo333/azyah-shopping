-- Add trim metadata columns to wardrobe_items
-- These columns store information about transparent padding that was removed
ALTER TABLE wardrobe_items 
ADD COLUMN IF NOT EXISTS trim_offset_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trim_offset_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_width INTEGER,
ADD COLUMN IF NOT EXISTS original_height INTEGER;

COMMENT ON COLUMN wardrobe_items.trim_offset_x IS 'Pixels trimmed from left edge during upload';
COMMENT ON COLUMN wardrobe_items.trim_offset_y IS 'Pixels trimmed from top edge during upload';
COMMENT ON COLUMN wardrobe_items.original_width IS 'Width before transparent padding trim';
COMMENT ON COLUMN wardrobe_items.original_height IS 'Height before transparent padding trim';