-- Add premium tracking columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_type text,
ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;

-- Add constraint for plan_type values
ALTER TABLE public.users
ADD CONSTRAINT users_plan_type_check CHECK (plan_type IS NULL OR plan_type IN ('monthly', 'yearly'));

-- Add Apple transaction tracking to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS apple_transaction_id text,
ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
ADD COLUMN IF NOT EXISTS apple_product_id text;

-- Create index for premium status lookups
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON public.users(is_premium) WHERE is_premium = true;