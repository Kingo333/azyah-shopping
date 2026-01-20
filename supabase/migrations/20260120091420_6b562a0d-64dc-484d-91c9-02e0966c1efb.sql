-- Add video_credits column to user_credits table
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS video_credits integer NOT NULL DEFAULT 1;

-- Create function to deduct video credit
CREATE OR REPLACE FUNCTION public.deduct_video_credit(target_user_id uuid, amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
BEGIN
  -- Get current credits
  SELECT video_credits INTO current_credits
  FROM user_credits
  WHERE user_id = target_user_id;
  
  -- Check if enough credits
  IF current_credits IS NULL OR current_credits < amount THEN
    RETURN false;
  END IF;
  
  -- Deduct credits
  UPDATE user_credits
  SET video_credits = video_credits - amount
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.deduct_video_credit(uuid, integer) TO authenticated;

-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_user_credits(uuid);

-- Recreate get_user_credits function with video_credits
CREATE OR REPLACE FUNCTION public.get_user_credits(target_user_id uuid)
RETURNS TABLE(
  ai_studio_credits integer,
  beauty_credits integer,
  wardrobe_credits integer,
  video_credits integer,
  is_premium boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_credits_record RECORD;
  premium_status BOOLEAN := false;
  ai_limit INTEGER := 4;
  beauty_limit INTEGER := 4;
  wardrobe_limit INTEGER := 20;
  video_limit INTEGER := 1;
BEGIN
  -- Check premium status
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE subscriptions.user_id = target_user_id 
    AND status = 'active' 
    AND current_period_end > NOW()
  ) INTO premium_status;
  
  -- Set limits based on premium status
  IF premium_status THEN
    ai_limit := 10;
    beauty_limit := 10;
    wardrobe_limit := 50;
    video_limit := 4;
  END IF;
  
  -- Get or create credits record
  SELECT * INTO user_credits_record
  FROM user_credits uc
  WHERE uc.user_id = target_user_id;
  
  -- Create record if doesn't exist
  IF user_credits_record IS NULL THEN
    INSERT INTO user_credits (
      user_id, 
      ai_studio_credits, 
      beauty_credits, 
      wardrobe_credits,
      video_credits,
      last_reset_date
    )
    VALUES (
      target_user_id, 
      ai_limit, 
      beauty_limit, 
      wardrobe_limit,
      video_limit,
      CURRENT_DATE
    )
    RETURNING * INTO user_credits_record;
  ELSE
    -- Reset if new day
    IF user_credits_record.last_reset_date < CURRENT_DATE THEN
      UPDATE user_credits uc
      SET 
        ai_studio_credits = ai_limit,
        beauty_credits = beauty_limit,
        wardrobe_credits = wardrobe_limit,
        video_credits = video_limit,
        last_reset_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE uc.user_id = target_user_id
      RETURNING * INTO user_credits_record;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    user_credits_record.ai_studio_credits,
    user_credits_record.beauty_credits,
    user_credits_record.wardrobe_credits,
    user_credits_record.video_credits,
    premium_status;
END;
$$;

-- Grant execute permission on recreated function
GRANT EXECUTE ON FUNCTION public.get_user_credits(uuid) TO authenticated;