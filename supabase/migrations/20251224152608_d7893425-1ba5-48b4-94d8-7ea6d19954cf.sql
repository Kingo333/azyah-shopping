-- ============================================================
-- SECURITY FIX: Block client SELECT on raw subscriptions table
-- and add row filtering to subscriptions_safe view
-- ============================================================

-- Step 1: Remove the SELECT policy that exposes sensitive payment columns
DROP POLICY IF EXISTS "users_select_own_subscription" ON public.subscriptions;

-- Step 2: Recreate the safe view with proper row filtering
DROP VIEW IF EXISTS public.subscriptions_safe;

CREATE VIEW public.subscriptions_safe 
WITH (security_invoker = true) AS
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
FROM public.subscriptions
WHERE user_id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON public.subscriptions_safe TO authenticated;

-- Verify: After this migration, subscriptions table should have NO SELECT policy for authenticated users
-- Only service_role ALL, authenticated INSERT, authenticated UPDATE remain