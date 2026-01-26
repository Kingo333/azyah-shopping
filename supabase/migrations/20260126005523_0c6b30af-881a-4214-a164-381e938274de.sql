-- Add bonus credit columns to user_credits table for points redemption
ALTER TABLE user_credits 
ADD COLUMN IF NOT EXISTS bonus_ai_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_beauty_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_video_credits INTEGER DEFAULT 0;

-- Create RPC function to redeem points for credits
CREATE OR REPLACE FUNCTION redeem_points_for_credits(
  target_user_id UUID,
  credit_type TEXT,
  credit_amount INTEGER,
  points_cost INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  column_name TEXT;
BEGIN
  -- Validate credit type
  IF credit_type NOT IN ('ai_studio', 'beauty', 'video') THEN
    RAISE EXCEPTION 'Invalid credit type: %', credit_type;
  END IF;

  -- Get current points balance
  SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0)
  INTO current_balance
  FROM points_ledger
  WHERE user_id = target_user_id;

  -- Check sufficient balance
  IF current_balance < points_cost THEN
    RAISE EXCEPTION 'Insufficient points balance. Have: %, Need: %', current_balance, points_cost;
  END IF;

  -- Deduct points from ledger
  INSERT INTO points_ledger (user_id, type, action_type, amount, metadata, idempotency_key)
  VALUES (
    target_user_id,
    'spend',
    'credit_redemption',
    points_cost,
    jsonb_build_object('credit_type', credit_type, 'credit_amount', credit_amount),
    'credit_redeem_' || target_user_id || '_' || credit_type || '_' || EXTRACT(EPOCH FROM now())::TEXT
  );

  -- Add bonus credits based on type
  IF credit_type = 'ai_studio' THEN
    UPDATE user_credits 
    SET bonus_ai_credits = COALESCE(bonus_ai_credits, 0) + credit_amount,
        updated_at = now()
    WHERE user_id = target_user_id;
  ELSIF credit_type = 'beauty' THEN
    UPDATE user_credits 
    SET bonus_beauty_credits = COALESCE(bonus_beauty_credits, 0) + credit_amount,
        updated_at = now()
    WHERE user_id = target_user_id;
  ELSIF credit_type = 'video' THEN
    UPDATE user_credits 
    SET bonus_video_credits = COALESCE(bonus_video_credits, 0) + credit_amount,
        updated_at = now()
    WHERE user_id = target_user_id;
  END IF;

  -- If no row updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, bonus_ai_credits, bonus_beauty_credits, bonus_video_credits)
    VALUES (
      target_user_id,
      CASE WHEN credit_type = 'ai_studio' THEN credit_amount ELSE 0 END,
      CASE WHEN credit_type = 'beauty' THEN credit_amount ELSE 0 END,
      CASE WHEN credit_type = 'video' THEN credit_amount ELSE 0 END
    );
  END IF;

  RETURN TRUE;
END;
$$;