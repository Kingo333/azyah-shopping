-- Fix Payment and Subscription Security Issues

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.validate_payment_access(uuid);

-- Handle payments table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        -- Drop existing payment policies
        DROP POLICY IF EXISTS "payment_owner_access" ON payments;
        DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
        DROP POLICY IF EXISTS "Users can manage their own payments" ON payments;
        DROP POLICY IF EXISTS "Service role can manage payments" ON payments;
        
        -- Create single consolidated payment access policy
        EXECUTE 'CREATE POLICY "payment_secure_access" ON payments
        FOR ALL
        USING (
          auth.uid() = user_id OR 
          auth.role() = ''service_role''
        )';
    END IF;
END $$;

-- Fix subscription table by removing all overlapping policies
DROP POLICY IF EXISTS "subscription_owner_access" ON subscriptions;
DROP POLICY IF EXISTS "subscription_owner_manage" ON subscriptions;
DROP POLICY IF EXISTS "subscription_owner_update" ON subscriptions;
DROP POLICY IF EXISTS "subscription_service_delete" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON subscriptions;

-- Create single consolidated subscription access policy
CREATE POLICY "subscription_secure_access" ON subscriptions
FOR ALL
USING (
  auth.uid() = user_id OR 
  auth.role() = 'service_role'
);

-- Create security validation function for payments
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

-- Create security reminder function
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