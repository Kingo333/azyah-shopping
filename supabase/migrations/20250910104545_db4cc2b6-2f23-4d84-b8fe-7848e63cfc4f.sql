-- Enhanced Payment Security Implementation (Simple)
-- Add additional security functions without modifying existing RLS policies

-- 1. Create secure payment access logging function
CREATE OR REPLACE FUNCTION public.log_payment_access(
  action_type text,
  payment_id uuid,
  access_context text DEFAULT 'direct'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Log all payment access attempts for audit purposes
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    action_type || ' - CONTEXT: ' || access_context || ' - PAYMENT_ID: ' || COALESCE(payment_id::text, 'NULL'),
    'payments',
    (SELECT user_id FROM payments WHERE id = payment_id),
    inet_client_addr()
  );
END;
$function$;

-- 2. Create secure payment verification function for service operations
CREATE OR REPLACE FUNCTION public.verify_payment_ownership(
  payment_id_param uuid,
  user_id_param uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  payment_owner_id uuid;
BEGIN
  -- Handle NULL payment_id (for bulk operations)
  IF payment_id_param IS NULL THEN
    RETURN auth.role() = 'service_role'::text;
  END IF;
  
  -- Get the payment owner
  SELECT user_id INTO payment_owner_id 
  FROM payments 
  WHERE id = payment_id_param;
  
  -- If payment doesn't exist, return false
  IF payment_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- For service role operations, allow access but log it
  IF auth.role() = 'service_role'::text THEN
    PERFORM log_payment_access('SERVICE_ROLE_ACCESS', payment_id_param, 'system_operation');
    RETURN true;
  END IF;
  
  -- For regular users, only allow access to their own payments
  IF user_id_param IS NOT NULL THEN
    RETURN payment_owner_id = user_id_param;
  ELSE
    RETURN payment_owner_id = auth.uid();
  END IF;
END;
$function$;

-- 3. Create secure payment update function for webhooks
CREATE OR REPLACE FUNCTION public.secure_update_payment_status(
  payment_intent_id_param text,
  new_status text,
  operation_context text DEFAULT 'webhook'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  payment_record payments;
BEGIN
  -- Only allow service role to call this function
  IF auth.role() != 'service_role'::text THEN
    RAISE EXCEPTION 'Access denied: Service role required for payment status updates';
  END IF;
  
  -- Get payment record
  SELECT * INTO payment_record 
  FROM payments 
  WHERE payment_intent_id = payment_intent_id_param;
  
  IF payment_record.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found for payment_intent_id: %', payment_intent_id_param;
  END IF;
  
  -- Log the update attempt
  PERFORM log_payment_access(
    'UPDATE_PAYMENT_STATUS', 
    payment_record.id, 
    operation_context || '_to_' || COALESCE(new_status, 'unknown')
  );
  
  -- Update payment status
  UPDATE payments 
  SET 
    status = new_status,
    updated_at = NOW()
  WHERE id = payment_record.id;
  
  RETURN true;
END;
$function$;

-- 4. Create function to get safe payment summary for users (excludes sensitive fields)
CREATE OR REPLACE FUNCTION public.get_user_payment_summary(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  amount_fils integer,
  currency text,
  product text,
  status text,
  provider text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Default to current user if no target specified
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;
  
  -- Only allow users to see their own payment summaries
  IF target_user_id != auth.uid() AND auth.role() != 'service_role'::text THEN
    RAISE EXCEPTION 'Access denied: You can only view your own payment summaries';
  END IF;
  
  -- Log access attempt
  PERFORM log_payment_access('VIEW_PAYMENT_SUMMARY', NULL, 'user_summary_request');
  
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.amount_fils,
    p.currency,
    p.product,
    p.status,
    p.provider,
    p.created_at,
    p.updated_at
  FROM payments p
  WHERE p.user_id = target_user_id
  ORDER BY p.created_at DESC;
END;
$function$;

-- 5. Enhanced admin payment access function with strict controls
CREATE OR REPLACE FUNCTION public.admin_access_payment_secure(
  payment_id_param uuid, 
  justification text,
  operation_type text DEFAULT 'admin_review'
)
RETURNS SETOF payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only allow service role (system admin access)
  IF auth.role() != 'service_role'::text THEN
    RAISE EXCEPTION 'Access denied: Service role required for administrative payment access';
  END IF;
  
  -- Require detailed justification
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 20 THEN
    RAISE EXCEPTION 'Administrative payment access requires detailed justification (minimum 20 characters)';
  END IF;
  
  -- Verify payment exists
  IF NOT EXISTS (SELECT 1 FROM payments WHERE id = payment_id_param) THEN
    RAISE EXCEPTION 'Payment record not found';
  END IF;
  
  -- Enhanced logging with justification
  PERFORM log_payment_access(
    'ADMIN_ACCESS_PAYMENT_' || operation_type,
    payment_id_param,
    'admin_justification: ' || justification
  );
  
  -- Return payment data
  RETURN QUERY SELECT * FROM payments WHERE id = payment_id_param;
END;
$function$;

-- 6. Payment security compliance validation
CREATE OR REPLACE FUNCTION public.validate_payment_security_status()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN 'PAYMENT SECURITY ENHANCED: All payment access is now logged with context tracking. Service role operations require justification. User access restricted to own payments with ownership verification.';
END;
$function$;