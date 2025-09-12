-- Remove the complex voice usage table and functions
DROP TABLE IF EXISTS public.user_voice_usage CASCADE;
DROP FUNCTION IF EXISTS public.get_voice_usage_today(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_voice_usage(uuid, integer, integer) CASCADE;

-- Create simple voice session tracking
CREATE TABLE public.voice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own voice sessions" 
ON public.voice_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own voice sessions" 
ON public.voice_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Simple function to get today's usage
CREATE OR REPLACE FUNCTION public.get_voice_usage_today(target_user_id UUID)
RETURNS TABLE(
  used_today INTEGER,
  daily_limit INTEGER,
  remaining_seconds INTEGER,
  is_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  premium_status BOOLEAN := FALSE;
  total_used INTEGER := 0;
  limit_seconds INTEGER := 120; -- 2 minutes for free
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
    limit_seconds := 300; -- 5 minutes for premium
  END IF;
  
  -- Get today's usage
  SELECT COALESCE(SUM(seconds_used), 0) INTO total_used
  FROM voice_sessions 
  WHERE user_id = target_user_id 
  AND created_at >= CURRENT_DATE;
  
  RETURN QUERY SELECT 
    total_used,
    limit_seconds,
    GREATEST(0, limit_seconds - total_used),
    premium_status;
END;
$$;

-- Function to log voice usage
CREATE OR REPLACE FUNCTION public.log_voice_usage(target_user_id UUID, seconds_used INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO voice_sessions (user_id, seconds_used)
  VALUES (target_user_id, seconds_used);
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;