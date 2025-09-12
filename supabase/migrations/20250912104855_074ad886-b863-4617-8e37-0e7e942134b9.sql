-- Create function to update voice usage
CREATE OR REPLACE FUNCTION public.update_voice_usage(
  target_user_id uuid, 
  input_secs integer DEFAULT 0, 
  output_secs integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  premium_status BOOLEAN := false;
  current_plan text := 'free';
BEGIN
  -- Check if user is premium
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = target_user_id 
    AND status = 'active' 
    AND current_period_end > NOW()
  ) INTO premium_status;
  
  IF premium_status THEN
    current_plan := 'premium';
  END IF;
  
  -- Insert or update today's usage
  INSERT INTO user_voice_usage (
    user_id, 
    date, 
    input_seconds, 
    output_seconds, 
    total_seconds,
    plan_type
  )
  VALUES (
    target_user_id,
    CURRENT_DATE,
    input_secs,
    output_secs,
    input_secs + output_secs,
    current_plan
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    input_seconds = user_voice_usage.input_seconds + input_secs,
    output_seconds = user_voice_usage.output_seconds + output_secs,
    total_seconds = user_voice_usage.total_seconds + input_secs + output_secs,
    plan_type = current_plan,
    updated_at = now();
    
  RETURN TRUE;
END;
$function$