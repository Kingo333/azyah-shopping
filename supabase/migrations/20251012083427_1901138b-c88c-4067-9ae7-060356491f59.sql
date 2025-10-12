-- Add wardrobe item count tracking to user_credits
ALTER TABLE user_credits 
ADD COLUMN IF NOT EXISTS wardrobe_items_count INTEGER DEFAULT 0;

-- Add constraint to prevent negative counts
ALTER TABLE user_credits
DROP CONSTRAINT IF EXISTS wardrobe_items_count_positive;

ALTER TABLE user_credits
ADD CONSTRAINT wardrobe_items_count_positive CHECK (wardrobe_items_count >= 0);

-- Function to get wardrobe limit based on subscription status
CREATE OR REPLACE FUNCTION get_wardrobe_limit(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium BOOLEAN;
BEGIN
  -- Check if user has active premium subscription
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = target_user_id 
    AND status = 'active' 
    AND current_period_end > NOW()
  ) INTO is_premium;
  
  -- Premium: unlimited (return high number), Free: 10
  IF is_premium THEN
    RETURN 999;
  ELSE
    RETURN 10;
  END IF;
END;
$$;

-- Function to check if user can add a wardrobe item
CREATE OR REPLACE FUNCTION can_add_wardrobe_item(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Get current item count
  SELECT COUNT(*) INTO current_count
  FROM wardrobe_items
  WHERE user_id = target_user_id;
  
  -- Get user's limit
  user_limit := get_wardrobe_limit(target_user_id);
  
  RETURN current_count < user_limit;
END;
$$;
