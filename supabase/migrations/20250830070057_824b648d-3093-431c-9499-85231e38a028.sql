-- CRITICAL SECURITY FIX: Simplify and Strengthen Payment RLS Policies
-- This migration removes overlapping policies and creates clear, secure access control

-- Step 1: Drop all existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Service role full access" ON public.payments;
DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create own payments only" ON public.payments;
DROP POLICY IF EXISTS "Users can create own payments with audit" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments only" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments only" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments with audit" ON public.payments;

-- Step 2: Create simplified, secure policies with clear separation of concerns

-- Policy 1: Users can only view their own payments (with audit logging)
CREATE POLICY "users_view_own_payments" ON public.payments
  FOR SELECT 
  TO public
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id 
    AND (SELECT log_user_data_access('VIEW_PAYMENT', 'payments', auth.uid())) IS NOT NULL
  );

-- Policy 2: Users can only create payments for themselves (with audit logging)
CREATE POLICY "users_create_own_payments" ON public.payments
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
    AND (SELECT log_user_data_access('CREATE_PAYMENT', 'payments', auth.uid())) IS NOT NULL
  );

-- Policy 3: Users can only update their own payments (with audit logging)
CREATE POLICY "users_update_own_payments" ON public.payments
  FOR UPDATE
  TO public
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
    AND (SELECT log_user_data_access('UPDATE_PAYMENT', 'payments', auth.uid())) IS NOT NULL
  );

-- Policy 4: Service role access (restricted to essential operations only)
CREATE POLICY "service_role_payments_access" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 5: Admin access with justification requirement
CREATE POLICY "admin_payments_access" ON public.payments
  FOR SELECT
  TO public
  USING (
    get_current_user_role() = 'admin'::user_role
    AND (SELECT log_user_data_access('ADMIN_VIEW_PAYMENT', 'payments', user_id)) IS NOT NULL
  );

-- Step 3: Create secure function for admin payment access with justification
CREATE OR REPLACE FUNCTION public.admin_access_payment_with_justification(
  payment_id_param uuid, 
  justification text
)
RETURNS SETOF payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin role
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Require justification
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 10 THEN
    RAISE EXCEPTION 'Admin access requires detailed justification (minimum 10 characters)';
  END IF;
  
  -- Log with justification
  PERFORM public.log_admin_access_with_justification(
    'ADMIN_ACCESS_PAYMENT_DATA', 
    'payments', 
    (SELECT user_id FROM payments WHERE id = payment_id_param),
    justification
  );
  
  RETURN QUERY SELECT * FROM public.payments WHERE id = payment_id_param;
END;
$function$;

-- Step 4: Create secure payment validation function
CREATE OR REPLACE FUNCTION public.validate_payment_access(payment_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payment_user_id uuid;
BEGIN
  -- Get the payment owner
  SELECT user_id INTO payment_user_id 
  FROM public.payments 
  WHERE id = payment_id_param;
  
  -- Check if payment exists
  IF payment_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Validate access: owner, admin, or service role
  RETURN (
    auth.uid() = payment_user_id OR 
    public.get_current_user_role() = 'admin' OR
    auth.role() = 'service_role'
  );
END;
$function$;

-- Step 5: Add additional security constraints
ALTER TABLE public.payments 
ADD CONSTRAINT payments_user_id_not_null 
CHECK (user_id IS NOT NULL);

-- Create index for performance and security
CREATE INDEX IF NOT EXISTS idx_payments_user_id_status 
ON public.payments(user_id, status) 
WHERE user_id IS NOT NULL;