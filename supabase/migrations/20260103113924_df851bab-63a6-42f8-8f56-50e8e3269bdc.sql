-- Add is_default column to wardrobe_items
ALTER TABLE wardrobe_items 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Mark existing items for shopper@test.com as defaults (items created before today)
UPDATE wardrobe_items
SET is_default = true
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'shopper@test.com')
AND is_default = false;

-- Update can_add_wardrobe_item function to exclude default items from count
CREATE OR REPLACE FUNCTION public.can_add_wardrobe_item(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Get current item count EXCLUDING defaults
  SELECT COUNT(*) INTO current_count
  FROM wardrobe_items
  WHERE user_id = target_user_id
  AND (is_default IS NULL OR is_default = false);
  
  -- Get user's limit
  user_limit := get_wardrobe_limit(target_user_id);
  
  RETURN current_count < user_limit;
END;
$function$;