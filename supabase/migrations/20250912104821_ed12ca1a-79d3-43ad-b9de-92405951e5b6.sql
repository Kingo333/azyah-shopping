-- Create function to get current voice usage
CREATE OR REPLACE FUNCTION public.get_voice_usage_today(target_user_id uuid)
RETURNS TABLE(
  remaining_seconds integer,
  total_limit integer,
  used_today integer,
  plan_type text,
  is_premium boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  premium_status BOOLEAN := false;
  daily_limit INTEGER := 120; -- 2 minutes for free users
  usage_today INTEGER := 0;
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
    daily_limit := 360; -- 6 minutes for premium users
  END IF;
  
  -- Get today's usage
  SELECT COALESCE(total_seconds, 0) INTO usage_today
  FROM user_voice_usage 
  WHERE user_id = target_user_id 
  AND date = CURRENT_DATE;
  
  RETURN QUERY SELECT 
    GREATEST(0, daily_limit - usage_today) as remaining_seconds,
    daily_limit as total_limit,
    usage_today as used_today,
    CASE WHEN premium_status THEN 'premium' ELSE 'free' END as plan_type,
    premium_status as is_premium;
END;
$function$