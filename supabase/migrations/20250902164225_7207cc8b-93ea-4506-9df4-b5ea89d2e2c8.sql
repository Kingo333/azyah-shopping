-- Fix remaining functions with missing search_path

-- Fix admin_access_payment_secure function
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
  PERFORM public.log_admin_payment_access(
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

-- Fix ensure_payment_security function
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