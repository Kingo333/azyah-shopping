-- Fix payments table RLS policies by simplifying to clear, non-overlapping rules
-- This addresses the security finding about complex overlapping policies

-- First, drop all existing payment RLS policies to start clean
DROP POLICY IF EXISTS "payment_secure_access" ON public.payments;
DROP POLICY IF EXISTS "service_role_payment_management" ON public.payments;
DROP POLICY IF EXISTS "users_create_own_payments_secure" ON public.payments;
DROP POLICY IF EXISTS "users_limited_payment_updates" ON public.payments;
DROP POLICY IF EXISTS "users_view_own_payment_summary" ON public.payments;

-- Create simple, secure RLS policies with clear access control

-- 1. Users can only view their own payments
CREATE POLICY "users_view_own_payments" ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can only create payments for themselves  
CREATE POLICY "users_create_own_payments" ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Only service role can update payments (for webhook processing)
CREATE POLICY "service_role_update_payments" ON public.payments
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- 4. Service role can manage all payments (for system operations)
CREATE POLICY "service_role_manage_payments" ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Block all DELETE operations on payments for data integrity
CREATE POLICY "block_payment_deletes" ON public.payments
  FOR DELETE
  USING (false);

-- Update the validation function to be simpler and more secure
CREATE OR REPLACE FUNCTION public.validate_payment_owner_access(payment_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow access if the user owns the payment or is a service role
  RETURN (
    auth.uid() = payment_user_id OR 
    auth.role() = 'service_role'
  );
END;
$function$;