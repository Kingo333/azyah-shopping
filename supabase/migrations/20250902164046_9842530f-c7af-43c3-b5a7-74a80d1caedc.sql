-- =============================================
-- SECURE RLS POLICIES FOR PAYMENTS TABLE
-- =============================================

-- Step 1: Create highly restrictive RLS policies

-- Policy 1: Service role only (for system operations)
CREATE POLICY "service_role_payment_management" ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Users can only view their own payment summaries (restricted access)
CREATE POLICY "users_view_own_payment_summary" ON public.payments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id AND
  public.validate_payment_owner_access(user_id) AND
  public.log_user_data_access('VIEW_OWN_PAYMENT', 'payments', auth.uid()) IS NOT NULL
);

-- Policy 3: Users can create payments only for themselves
CREATE POLICY "users_create_own_payments_secure" ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  public.log_user_data_access('CREATE_PAYMENT', 'payments', auth.uid()) IS NOT NULL
);

-- Policy 4: Extremely limited update access (only by payment owner)
CREATE POLICY "users_limited_payment_updates" ON public.payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id AND
  public.validate_payment_owner_access(user_id)
)
WITH CHECK (
  auth.uid() = user_id
);

-- Step 2: Add payment data security reminder function
CREATE OR REPLACE FUNCTION public.ensure_payment_security()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'SECURITY REMINDER: Sensitive payment fields (payment_intent_id, operation_id) should be encrypted at application level. Access is now restricted to payment owners and authorized system roles only.';
END;
$$;