-- =============================================
-- PAYMENT SECURITY FIX - CRITICAL VULNERABILITIES
-- =============================================

-- Step 1: Drop existing overly permissive policies
DROP POLICY IF EXISTS "admin_payments_access" ON public.payments;
DROP POLICY IF EXISTS "service_role_payments_access" ON public.payments;
DROP POLICY IF EXISTS "users_create_own_payments" ON public.payments;
DROP POLICY IF EXISTS "users_update_own_payments" ON public.payments;
DROP POLICY IF EXISTS "users_view_own_payments" ON public.payments;

-- Step 2: Create secure payment access validation function
CREATE OR REPLACE FUNCTION public.validate_payment_owner_access(payment_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access if the user owns the payment or is a service role
  RETURN (
    auth.uid() = payment_user_id OR 
    auth.role() = 'service_role'
  );
END;
$$;

-- Step 3: Create admin payment access function with strict justification requirements
CREATE OR REPLACE FUNCTION public.admin_access_payment_secure(target_payment_id uuid, justification text)
RETURNS TABLE(
  id uuid,
  provider text,
  user_id uuid,
  product text,
  amount_fils integer,
  currency text,
  status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role with strict requirements
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required for payment data access';
  END IF;
  
  -- Require detailed justification for payment access (compliance requirement)
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 25 THEN
    RAISE EXCEPTION 'Payment access requires detailed business justification (minimum 25 characters)';
  END IF;
  
  -- Log admin access with justification for audit trail
  PERFORM public.log_admin_access_with_justification(
    'ADMIN_ACCESS_PAYMENT_SECURE', 
    'payments', 
    (SELECT p.user_id FROM payments p WHERE p.id = target_payment_id),
    justification
  );
  
  -- Return only essential payment data (no sensitive fields like payment_intent_id, operation_id)
  RETURN QUERY
  SELECT 
    p.id,
    p.provider,
    p.user_id,
    p.product,
    p.amount_fils,
    p.currency,
    p.status,
    p.created_at
  FROM public.payments p
  WHERE p.id = target_payment_id;
END;
$$;

-- Step 4: Create secure payment summary function for users
CREATE OR REPLACE FUNCTION public.get_my_payment_summary()
RETURNS TABLE(
  id uuid,
  product text,
  amount_fils integer,
  currency text,
  status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access payment data';
  END IF;
  
  -- Log access for audit purposes
  PERFORM public.log_user_data_access('VIEW_OWN_PAYMENT_SUMMARY', 'payments', auth.uid());
  
  -- Return only safe payment summary (no sensitive payment processing details)
  RETURN QUERY
  SELECT 
    p.id,
    p.product,
    p.amount_fils,
    p.currency,
    p.status,
    p.created_at
  FROM public.payments p
  WHERE p.user_id = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$;

-- Step 5: Create audit function for admin access with justification
CREATE OR REPLACE FUNCTION public.log_admin_access_with_justification(
  action_type text,
  table_name text,
  accessed_user_id uuid,
  justification text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log admin access with detailed justification
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    table_name, 
    accessed_user_id, 
    ip_address
  ) VALUES (
    auth.uid(),
    action_type || ' - JUSTIFICATION: ' || justification,
    table_name,
    accessed_user_id,
    inet_client_addr()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently continue if logging fails (don't break payment operations)
    NULL;
END;
$$;

-- Step 6: Create highly restrictive RLS policies

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

-- Step 7: Add payment data security reminder function
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