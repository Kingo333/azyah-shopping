-- Create user credits table
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 4,
  credits_used_today INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own credits" 
ON public.user_credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits" 
ON public.user_credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" 
ON public.user_credits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to get/update user credits
CREATE OR REPLACE FUNCTION public.get_user_credits(target_user_id UUID)
RETURNS TABLE(credits_remaining INTEGER, is_premium BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_credits_record RECORD;
  premium_status BOOLEAN := false;
  daily_limit INTEGER := 4;
BEGIN
  -- Check if user is premium
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = target_user_id 
    AND status = 'active' 
    AND current_period_end > NOW()
  ) INTO premium_status;
  
  -- Set daily limit based on premium status
  IF premium_status THEN
    daily_limit := 10;
  END IF;
  
  -- Get or create user credits record
  SELECT * INTO user_credits_record
  FROM user_credits 
  WHERE user_id = target_user_id;
  
  -- If no record exists, create one
  IF user_credits_record IS NULL THEN
    INSERT INTO user_credits (user_id, credits_remaining, credits_used_today, last_reset_date)
    VALUES (target_user_id, daily_limit, 0, CURRENT_DATE)
    RETURNING * INTO user_credits_record;
  ELSE
    -- Reset credits if it's a new day
    IF user_credits_record.last_reset_date < CURRENT_DATE THEN
      UPDATE user_credits 
      SET credits_remaining = daily_limit,
          credits_used_today = 0,
          last_reset_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE user_id = target_user_id
      RETURNING * INTO user_credits_record;
    END IF;
  END IF;
  
  RETURN QUERY SELECT user_credits_record.credits_remaining, premium_status;
END;
$$;

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_user_credit(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT credits_remaining INTO current_credits
  FROM user_credits 
  WHERE user_id = target_user_id;
  
  -- Check if user has credits
  IF current_credits IS NULL OR current_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credit
  UPDATE user_credits 
  SET credits_remaining = credits_remaining - 1,
      credits_used_today = credits_used_today + 1,
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Update user_sessions table to include expiry tracking
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours');

-- Create index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(session_expires_at);

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE session_expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;