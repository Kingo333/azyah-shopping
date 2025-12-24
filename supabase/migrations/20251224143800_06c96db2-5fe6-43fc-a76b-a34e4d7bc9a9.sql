-- Fix the security definer view issue
-- Recreate the view with explicit SECURITY INVOKER to ensure RLS is checked against querying user
DROP VIEW IF EXISTS public.subscriptions_safe;

CREATE VIEW public.subscriptions_safe 
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.user_id,
  s.plan,
  s.plan_tier,
  s.status,
  s.currency,
  s.price_cents,
  s.current_period_start,
  s.current_period_end,
  s.renewal_at,
  s.features_granted,
  s.ai_tryon_limit,
  s.ugc_collaboration_enabled,
  s.nail_salon_reward_eligible,
  s.created_at,
  s.updated_at
FROM public.subscriptions s
WHERE s.user_id = auth.uid();

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.subscriptions_safe TO authenticated;

-- Also need to allow authenticated users to use the auth.uid() function in the view context
-- This is already available, but we need SELECT on the underlying table for service_role to work
-- The view's WHERE clause + service_role policy should work together

-- Actually, for the view to work, we need authenticated users to be able to SELECT through it
-- But we removed SELECT policy for authenticated on raw table
-- So we need to add a policy that allows SELECT only through the view
-- 
-- The trick is: views with security_invoker=true check RLS, but since we have no SELECT policy
-- for authenticated, they can't read. We need a different approach.
--
-- Better approach: Keep a SELECT policy for authenticated, but the view only exposes safe columns
-- Re-add SELECT policy for authenticated users on raw table
CREATE POLICY "Users can select their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);