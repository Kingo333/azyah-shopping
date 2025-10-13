-- PHASE 1.1: Database Migrations for Onboarding Overhaul

-- Make username collection optional but indexed (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique 
  ON public.users (LOWER(username)) 
  WHERE username IS NOT NULL;

-- Add case-insensitive email index
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique 
  ON public.users (LOWER(email));

-- Extend subscriptions table for new plan structure
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_tier text 
    CHECK (plan_tier IN ('free', 'monthly', 'yearly')) 
    DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS price_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features_granted jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS renewal_at timestamptz;

-- Mark legacy onboarding fields as deprecated
COMMENT ON COLUMN public.users.gender_selected IS 'DEPRECATED: No longer collected in onboarding';
COMMENT ON COLUMN public.users.main_goals IS 'DEPRECATED: No longer collected in onboarding';
COMMENT ON COLUMN public.users.referral_source IS 'DEPRECATED: No longer collected in onboarding';
COMMENT ON COLUMN public.users.date_of_birth IS 'DEPRECATED: No longer collected in onboarding';