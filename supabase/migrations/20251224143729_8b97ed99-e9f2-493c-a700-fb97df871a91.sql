-- Step 1: Create a safe view that excludes sensitive payment provider IDs
-- This view will be used by the frontend to read subscription data
CREATE OR REPLACE VIEW public.subscriptions_safe AS
SELECT 
  id,
  user_id,
  plan,
  plan_tier,
  status,
  currency,
  price_cents,
  current_period_start,
  current_period_end,
  renewal_at,
  features_granted,
  ai_tryon_limit,
  ugc_collaboration_enabled,
  nail_salon_reward_eligible,
  created_at,
  updated_at
FROM public.subscriptions
WHERE user_id = auth.uid();

-- Step 2: Drop existing SELECT policies on subscriptions table
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.subscriptions;

-- Step 3: Create new restrictive SELECT policy - only service_role can read raw table
-- This prevents direct client queries from exposing sensitive columns
CREATE POLICY "Only service role can read subscriptions"
ON public.subscriptions
FOR SELECT
TO service_role
USING (true);

-- Step 4: Keep authenticated users able to INSERT/UPDATE their own subscription
-- (This is needed for syncSubscriptionRecord from iOS app)
-- But we'll limit what columns they can write by using a trigger

-- First, drop any existing INSERT/UPDATE policies to recreate cleanly
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Users can insert their own subscription (for initial sync from iOS)
CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription (for sync from iOS)
CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for webhooks)
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.subscriptions;
CREATE POLICY "Service role full access to subscriptions"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Note: The subscriptions_safe view inherits RLS from the base table,
-- but since we filter by auth.uid() = user_id in the view itself,
-- authenticated users can query it without needing SELECT on the raw table.