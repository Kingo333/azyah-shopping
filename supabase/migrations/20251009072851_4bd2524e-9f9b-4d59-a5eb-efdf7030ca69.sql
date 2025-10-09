-- Add missing background removal quota columns to user_credits table
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS bg_removals_used_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bg_removals_quota_monthly INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;