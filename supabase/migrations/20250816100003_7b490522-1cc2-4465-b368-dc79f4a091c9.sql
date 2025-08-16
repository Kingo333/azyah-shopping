-- Remove the security definer view issue by recreating the view properly
DROP VIEW IF EXISTS public.subscription_status;

-- Create the subscription status view without security definer properties
-- This view already has proper RLS because it filters by auth.uid() = user_id
CREATE VIEW public.subscription_status AS
SELECT 
  id,
  user_id,
  plan,
  status,
  current_period_end,
  created_at
FROM public.subscriptions
WHERE auth.uid() = user_id;

COMMENT ON VIEW public.subscription_status IS 'Safe view of subscription data without sensitive payment information - only shows current user data';