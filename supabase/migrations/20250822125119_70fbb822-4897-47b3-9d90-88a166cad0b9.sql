-- Add unique constraint to subscriptions table for user_id
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Add failure_url column to payments table to match the edge function
ALTER TABLE public.payments ADD COLUMN failure_url TEXT;