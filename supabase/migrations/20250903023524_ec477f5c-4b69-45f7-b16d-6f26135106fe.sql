-- Fix Payment and Subscription Security Issues

-- First, let's check if payments table exists and create proper RLS policies
-- Drop any existing problematic payment policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can manage their own payments" ON payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON payments;

-- Create consolidated, secure payment access policies
CREATE POLICY "payment_owner_access" ON payments
FOR ALL
USING (
  auth.uid() = user_id OR 
  auth.role() = 'service_role'
);

-- Fix subscription table by removing overlapping policies
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON subscriptions;

-- Create consolidated, secure subscription access policies
CREATE POLICY "subscription_owner_access" ON subscriptions
FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.role() = 'service_role'
);

CREATE POLICY "subscription_owner_manage" ON subscriptions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  auth.role() = 'service_role'
);

CREATE POLICY "subscription_owner_update" ON subscriptions
FOR UPDATE
USING (
  auth.uid() = user_id OR 
  auth.role() = 'service_role'
);

CREATE POLICY "subscription_service_delete" ON subscriptions
FOR DELETE
USING (auth.role() = 'service_role');

-- Add additional security functions for payment validation
CREATE OR REPLACE FUNCTION public.validate_payment_access(payment_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow access if the user owns the payment or is a service role
  RETURN (
    auth.uid() = payment_user_id OR 
    auth.role() = 'service_role'
  );
END;
$$;

-- Add security reminder function
CREATE OR REPLACE FUNCTION public.ensure_payment_security()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN 'SECURITY REMINDER: Sensitive payment fields (payment_intent_id, operation_id) should be encrypted at application level. Access is now restricted to payment owners and authorized system roles only.';
END;
$$;