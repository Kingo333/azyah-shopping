-- Fix security warnings by setting search_path for functions

-- Fix log_admin_payment_access function
CREATE OR REPLACE FUNCTION public.log_admin_payment_access(
  action_type text,
  target_table text,
  accessed_user_id uuid,
  business_justification text
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
    action_type || ' - JUSTIFICATION: ' || business_justification,
    target_table,
    accessed_user_id,
    inet_client_addr()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently continue if logging fails (don't break payment operations)
    NULL;
END;
$$;

-- Fix get_my_payment_summary function  
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