-- ============================================================
-- FINAL CLEANUP: Remove all duplicate/legacy SELECT policies
-- Keep only the clean one we just created
-- ============================================================

-- Drop legacy SELECT policies with audit logging (not needed, adds overhead)
DROP POLICY IF EXISTS "Users can view subscription with audit" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription with audit" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can select their own subscription" ON public.subscriptions;

-- Drop duplicate INSERT/UPDATE policies (keep one of each)
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

-- Drop the ALL policy that's too permissive
DROP POLICY IF EXISTS "subscription_secure_access" ON public.subscriptions;

-- Now we should have only:
-- 1. Service role full access to subscriptions (ALL for service_role)
-- 2. Users can insert their own subscription (INSERT for authenticated)
-- 3. Users can update their own subscription (UPDATE for authenticated)
-- 4. users_select_own_subscription (SELECT for authenticated)