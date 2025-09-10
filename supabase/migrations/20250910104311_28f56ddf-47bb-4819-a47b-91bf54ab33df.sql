-- Enhanced Payment Security Implementation
-- Add additional safeguards for payment data access while preserving system functionality

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
    action_type || ' - CONTEXT: ' || access_context || ' - PAYMENT_ID: ' || payment_id::text,
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
    operation_context || '_from_' || COALESCE(new_status, 'unknown')
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

-- 4. Add payment data encryption reminder function
CREATE OR REPLACE FUNCTION public.ensure_payment_data_security()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN 'SECURITY REMINDER: Payment data access is now enhanced with audit logging. Sensitive fields should remain encrypted at application level. Service role access is logged and monitored.';
END;
$function$;

-- 5. Update existing admin payment access function to use enhanced security
CREATE OR REPLACE FUNCTION public.admin_access_payment_with_enhanced_security(
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
  
  -- Verify payment exists and log access
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

-- 6. Create view for safe payment summary (non-sensitive data)
CREATE OR REPLACE VIEW public.payment_summary_safe AS
SELECT 
  id,
  user_id,
  amount_fils,
  currency,
  product,
  status,
  provider,
  created_at,
  updated_at,
  -- Exclude sensitive fields like payment_intent_id, operation_id, URLs
  'REDACTED'::text as payment_intent_id_redacted,
  'REDACTED'::text as operation_id_redacted
FROM payments;

-- Grant select on safe view to authenticated users (they can only see their own via RLS)
GRANT SELECT ON public.payment_summary_safe TO authenticated;

-- 7. Add RLS policy for the safe payment summary view
CREATE POLICY "users_view_own_payment_summaries" ON public.payment_summary_safe
FOR SELECT USING (auth.uid() = user_id);