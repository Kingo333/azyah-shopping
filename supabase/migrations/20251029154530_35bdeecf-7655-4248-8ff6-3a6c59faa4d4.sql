-- Add selected_item_id to wardrobe_layers table
ALTER TABLE public.wardrobe_layers 
ADD COLUMN selected_item_id UUID REFERENCES wardrobe_items(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_wardrobe_layers_selected_item 
ON wardrobe_layers(selected_item_id) 
WHERE selected_item_id IS NOT NULL;

-- Set first item as selected for existing layers
UPDATE wardrobe_layers wl
SET selected_item_id = (
  SELECT wi.id 
  FROM wardrobe_items wi 
  WHERE wi.category = wl.category 
    AND wi.user_id = wl.user_id
  ORDER BY wi.created_at ASC
  LIMIT 1
)
WHERE selected_item_id IS NULL;