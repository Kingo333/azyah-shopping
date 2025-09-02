-- =============================================
-- PAYMENT SECURITY FIX - CRITICAL VULNERABILITIES (CORRECTED)
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

-- Step 5: Create read-only transaction check helper
CREATE OR REPLACE FUNCTION public.__is_read_only_tx()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Try to create a temporary table to test if we're in a read-only transaction
    CREATE TEMP TABLE IF NOT EXISTS __test_tx_check (id int);
    DROP TABLE IF EXISTS __test_tx_check;
    RETURN false;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN true;
  END;
END;
$$;

-- Step 6: Create audit function for admin access with justification
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
  -- Skip if in read-only transaction
  IF public.__is_read_only_tx() THEN
    RETURN;
  END IF;

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
END;
$$;