-- Fix Payment and Subscription Security Issues

-- First, drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.validate_payment_access(uuid);

-- Check if payments table exists and create proper RLS policies
-- Drop any existing problematic payment policies if they exist
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can manage their own payments" ON payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON payments;

-- Create consolidated, secure payment access policies (only if payments table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        -- Create consolidated payment access policy
        EXECUTE 'CREATE POLICY "payment_owner_access" ON payments
        FOR ALL
        USING (
          auth.uid() = user_id OR 
          auth.role() = ''service_role''
        )';
    END IF;
END $$;

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

-- Create new security validation function with different name
CREATE OR REPLACE FUNCTION public.validate_payment_owner_access(payment_user_id uuid)
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