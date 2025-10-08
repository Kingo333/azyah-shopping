-- Phase 1: Database Schema Updates for Complete Onboarding System

-- Add new columns to users table for onboarding data
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS gender_selected text CHECK (gender_selected IN ('woman', 'man', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS preferences_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_source text,
ADD COLUMN IF NOT EXISTS main_goals jsonb DEFAULT '[]'::jsonb;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Update subscriptions table for Stripe integration
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS ai_tryon_limit integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS ugc_collaboration_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nail_salon_reward_eligible boolean DEFAULT false;

-- Update subscription provider default
ALTER TABLE public.subscriptions
ALTER COLUMN provider SET DEFAULT 'stripe';

-- Update user_credits to work with subscription-based limits
-- Premium users get unlimited (999) tries, free users get 4
CREATE OR REPLACE FUNCTION public.get_user_ai_tryon_limit(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_limit integer;
  is_premium boolean;
BEGIN
  -- Check if user has active premium subscription
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = target_user_id 
    AND status = 'active' 
    AND current_period_end > NOW()
  ) INTO is_premium;
  
  -- Premium users get unlimited (999), free users get 4
  IF is_premium THEN
    RETURN 999;
  ELSE
    RETURN 4;
  END IF;
END;
$$;

-- Mark existing users as having completed onboarding
UPDATE public.users 
SET onboarding_completed = true 
WHERE created_at < NOW();

-- Create function to check username availability
CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS(
    SELECT 1 FROM public.users 
    WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$;