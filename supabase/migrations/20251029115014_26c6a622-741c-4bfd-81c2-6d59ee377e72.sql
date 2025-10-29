-- Add separate credit columns for each feature
ALTER TABLE public.user_credits
ADD COLUMN IF NOT EXISTS ai_studio_credits INTEGER NOT NULL DEFAULT 4,
ADD COLUMN IF NOT EXISTS beauty_credits INTEGER NOT NULL DEFAULT 4,
ADD COLUMN IF NOT EXISTS wardrobe_credits INTEGER NOT NULL DEFAULT 20;

-- Update existing records to initialize credit values
UPDATE public.user_credits
SET 
  ai_studio_credits = 4,
  beauty_credits = 4,
  wardrobe_credits = 20
WHERE ai_studio_credits IS NULL OR beauty_credits IS NULL OR wardrobe_credits IS NULL;

-- Drop and recreate get_user_credits function with new return type
DROP FUNCTION IF EXISTS public.get_user_credits(uuid);

CREATE FUNCTION public.get_user_credits(target_user_id UUID)
RETURNS TABLE(
  ai_studio_credits INTEGER,
  beauty_credits INTEGER,
  wardrobe_credits INTEGER,
  is_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_credits_record RECORD;
  premium_status BOOLEAN := false;
  ai_limit INTEGER := 4;
  beauty_limit INTEGER := 4;
  wardrobe_limit INTEGER := 20;
BEGIN
  -- Check premium status
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = target_user_id 
    AND status = 'active' 
    AND current_period_end > NOW()
  ) INTO premium_status;
  
  -- Set limits based on premium status
  IF premium_status THEN
    ai_limit := 10;
    beauty_limit := 10;
    wardrobe_limit := 50;
  END IF;
  
  -- Get or create credits record
  SELECT * INTO user_credits_record
  FROM user_credits 
  WHERE user_id = target_user_id;
  
  -- Create record if doesn't exist
  IF user_credits_record IS NULL THEN
    INSERT INTO user_credits (
      user_id, 
      ai_studio_credits, 
      beauty_credits, 
      wardrobe_credits,
      last_reset_date
    )
    VALUES (
      target_user_id, 
      ai_limit, 
      beauty_limit, 
      wardrobe_limit,
      CURRENT_DATE
    )
    RETURNING * INTO user_credits_record;
  ELSE
    -- Reset if new day
    IF user_credits_record.last_reset_date < CURRENT_DATE THEN
      UPDATE user_credits 
      SET 
        ai_studio_credits = ai_limit,
        beauty_credits = beauty_limit,
        wardrobe_credits = wardrobe_limit,
        last_reset_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE user_id = target_user_id
      RETURNING * INTO user_credits_record;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    user_credits_record.ai_studio_credits,
    user_credits_record.beauty_credits,
    user_credits_record.wardrobe_credits,
    premium_status;
END;
$$;

-- Create AI Studio credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_ai_studio_credit(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT ai_studio_credits INTO current_credits
  FROM user_credits 
  WHERE user_id = target_user_id;
  
  IF current_credits IS NULL OR current_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  UPDATE user_credits 
  SET 
    ai_studio_credits = ai_studio_credits - 1,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Create Beauty Consultant credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_beauty_credit(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT beauty_credits INTO current_credits
  FROM user_credits 
  WHERE user_id = target_user_id;
  
  IF current_credits IS NULL OR current_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  UPDATE user_credits 
  SET 
    beauty_credits = beauty_credits - 1,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Create Wardrobe Enhancement credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_wardrobe_credit(target_user_id UUID, amount INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT wardrobe_credits INTO current_credits
  FROM user_credits 
  WHERE user_id = target_user_id;
  
  IF current_credits IS NULL OR current_credits < amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE user_credits 
  SET 
    wardrobe_credits = wardrobe_credits - amount,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;