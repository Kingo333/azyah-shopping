-- Create voice usage tracking table
CREATE TABLE public.user_voice_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  input_seconds integer NOT NULL DEFAULT 0,
  output_seconds integer NOT NULL DEFAULT 0,
  total_seconds integer NOT NULL DEFAULT 0,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.user_voice_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own voice usage" 
ON public.user_voice_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice usage" 
ON public.user_voice_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice usage" 
ON public.user_voice_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

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

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_voice_usage_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

CREATE TRIGGER update_voice_usage_updated_at
BEFORE UPDATE ON public.user_voice_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_voice_usage_updated_at();