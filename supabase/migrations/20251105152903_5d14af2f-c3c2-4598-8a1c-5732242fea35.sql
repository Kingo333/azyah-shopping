-- Handle original item deletion or privacy changes to auto-remove copied items
-- When original item is deleted or made private, remove all community_copy instances

CREATE OR REPLACE FUNCTION handle_original_item_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle deletion of original item
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.wardrobe_items
    WHERE source = 'community_copy'
    AND attribution_user_id = OLD.user_id
    AND image_url = OLD.image_url;
    RETURN OLD;
  END IF;
  
  -- Handle privacy change from public to private
  IF TG_OP = 'UPDATE' AND OLD.public_reuse_permitted = true AND NEW.public_reuse_permitted = false THEN
    DELETE FROM public.wardrobe_items
    WHERE source = 'community_copy'
    AND attribution_user_id = OLD.user_id
    AND image_url = OLD.image_url;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger when item is deleted
CREATE TRIGGER handle_original_item_deleted
AFTER DELETE ON public.wardrobe_items
FOR EACH ROW
EXECUTE FUNCTION handle_original_item_changes();

-- Trigger when public_reuse_permitted changes
CREATE TRIGGER handle_original_item_privacy_changed
AFTER UPDATE OF public_reuse_permitted ON public.wardrobe_items
FOR EACH ROW
EXECUTE FUNCTION handle_original_item_changes();