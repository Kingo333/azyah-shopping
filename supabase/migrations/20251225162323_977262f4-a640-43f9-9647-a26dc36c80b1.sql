-- Add RESTRICTIVE policy to guarantee no anonymous access to payments
-- This works alongside existing PERMISSIVE policies
-- Service role bypasses RLS entirely, so webhooks/RevenueCat unaffected

-- RESTRICTIVE policies use AND logic - ALL must pass
-- This ensures auth.uid() IS NOT NULL is always required
CREATE POLICY "payments_require_authentication"
ON public.payments
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON POLICY "payments_require_authentication" ON public.payments IS 
'RESTRICTIVE policy ensuring only authenticated users can access payments. Service role bypasses RLS entirely.';