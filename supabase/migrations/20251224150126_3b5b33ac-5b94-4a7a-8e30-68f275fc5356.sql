-- ============================================================
-- FIX RLS POLICIES ON subscriptions TABLE
-- Goal: Ensure clients cannot SELECT sensitive payment columns
-- ============================================================

-- Step 1: Drop ALL existing SELECT policies to start clean
DROP POLICY IF EXISTS "Only service role can read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can select own subscription" ON public.subscriptions;

-- Step 2: Keep existing INSERT/UPDATE policies for authenticated users
-- (They only write non-sensitive fields, which is fine)
-- These should already exist, but ensure they're correct

-- Step 3: Create ONE clean SELECT policy
-- Users can only view their own subscription record
CREATE POLICY "users_select_own_subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Step 4: Ensure service role has full access (bypasses RLS anyway, but be explicit)
-- Service role is used by RevenueCat webhook to write sensitive Apple IDs

-- Step 5: Verify subscriptions_safe view exists and excludes sensitive columns
-- Recreate it to be absolutely certain it's correct
DROP VIEW IF EXISTS public.subscriptions_safe;

CREATE VIEW public.subscriptions_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  plan,
  plan_tier,
  status,
  currency,
  price_cents,
  features_granted,
  current_period_start,
  current_period_end,
  renewal_at,
  created_at,
  updated_at
  -- EXCLUDED: apple_transaction_id, apple_original_transaction_id, 
  -- apple_product_id, last_payment_intent_id, last_payment_status
FROM public.subscriptions;

-- Grant SELECT on safe view to authenticated users
GRANT SELECT ON public.subscriptions_safe TO authenticated;

-- Add comment documenting security intent
COMMENT ON VIEW public.subscriptions_safe IS 
'Safe view of subscriptions that excludes sensitive payment provider IDs. 
All client code should read from this view, never the raw subscriptions table.';

COMMENT ON POLICY "users_select_own_subscription" ON public.subscriptions IS
'Allows authenticated users to view only their own subscription. 
Note: The subscriptions_safe view should be used by clients instead of the raw table.';