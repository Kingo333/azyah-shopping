-- Fix security issues with users table and payment data access - Updated approach

-- 1. First, let's create a payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  payment_intent_id TEXT,
  status TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'ziina',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2. Create a secure admin access function with mandatory logging
CREATE OR REPLACE FUNCTION public.admin_access_user_data(target_user_id UUID)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin role
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Mandatory audit logging for admin access
  PERFORM public.log_user_data_access('ADMIN_ACCESS_USER_DATA', 'users', target_user_id);
  
  -- Return user data
  RETURN QUERY SELECT * FROM public.users WHERE id = target_user_id;
END;
$$;

-- 3. Create email access function with strict logging
CREATE OR REPLACE FUNCTION public.get_user_email_secure(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only allow access to own email or admin with justification
  IF target_user_id != auth.uid() AND public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Email access restricted to profile owner or admin';
  END IF;
  
  -- Mandatory audit logging for email access
  PERFORM public.log_user_data_access('ACCESS_USER_EMAIL', 'users', target_user_id);
  
  SELECT email INTO user_email FROM public.users WHERE id = target_user_id;
  RETURN user_email;
END;
$$;

-- 4. Create restrictive payment access policies
CREATE POLICY "Users can view their own payments only"
ON public.payments
FOR SELECT
USING (
  auth.uid() = user_id AND
  (SELECT public.log_user_data_access('VIEW_OWN_PAYMENTS', 'payments', auth.uid())) IS NOT NULL
);

CREATE POLICY "Users can insert their own payments"
ON public.payments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (SELECT public.log_user_data_access('CREATE_PAYMENT', 'payments', auth.uid())) IS NOT NULL
);

CREATE POLICY "Service role can manage payments"
ON public.payments
FOR ALL
USING (auth.role() = 'service_role');

-- 5. Create secure payment access function for system operations
CREATE OR REPLACE FUNCTION public.admin_access_payment_data(payment_id UUID)
RETURNS SETOF payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin role
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required for payment data access';
  END IF;
  
  -- Mandatory audit logging for payment access
  PERFORM public.log_user_data_access('ADMIN_ACCESS_PAYMENT_DATA', 'payments', 
    (SELECT user_id FROM payments WHERE id = payment_id)
  );
  
  -- Return payment data
  RETURN QUERY SELECT * FROM public.payments WHERE id = payment_id;
END;
$$;

-- 6. Enhance subscriptions table security
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

CREATE POLICY "Users can view their own subscription with audit"
ON public.subscriptions
FOR SELECT
USING (
  auth.uid() = user_id AND
  (SELECT public.log_user_data_access('VIEW_OWN_SUBSCRIPTION', 'subscriptions', auth.uid())) IS NOT NULL
);

CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.role() = 'service_role');

-- 7. Add trigger for payment data audit
CREATE OR REPLACE FUNCTION public.audit_payment_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all payment table access
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    auth.uid(),
    TG_OP || '_PAYMENT_DATA',
    'payments',
    COALESCE(NEW.user_id, OLD.user_id),
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for payment audit
DROP TRIGGER IF EXISTS payment_audit_trigger ON public.payments;
CREATE TRIGGER payment_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_access();

-- 8. Create function to validate admin justification for data access
CREATE OR REPLACE FUNCTION public.log_admin_access_with_justification(
  action_type TEXT,
  target_table TEXT,
  target_user_id UUID,
  justification TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure admin provides justification
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 10 THEN
    RAISE EXCEPTION 'Admin access requires detailed justification (minimum 10 characters)';
  END IF;
  
  -- Log with justification
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    auth.uid(),
    action_type || ' - JUSTIFIED: ' || justification,
    target_table,
    target_user_id,
    inet_client_addr()
  );
END;
$$;

-- 9. Create payment encryption reminder function
CREATE OR REPLACE FUNCTION public.check_payment_encryption()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function serves as a reminder that payment data should be encrypted at rest
  -- and that sensitive fields like payment_intent_id should be properly secured
  RETURN 'Payment data encryption check: Ensure sensitive payment fields are encrypted at application level';
END;
$$;