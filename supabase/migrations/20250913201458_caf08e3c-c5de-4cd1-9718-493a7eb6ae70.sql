-- Fix Security Issues: Secure Users and Payments Tables
-- ========================================================

-- 1. USERS TABLE SECURITY FIX
-- Remove redundant policies and ensure only authenticated users can access their own data

-- Drop existing overlapping policies for users table
DROP POLICY IF EXISTS "Users can create their profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "users_create_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_view_own_profile" ON public.users;

-- Create simplified, secure policies for users table
CREATE POLICY "users_secure_create" ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND auth.uid() IS NOT NULL);

CREATE POLICY "users_secure_read" ON public.users  
FOR SELECT
TO authenticated
USING (auth.uid() = id AND auth.uid() IS NOT NULL);

CREATE POLICY "users_secure_update" ON public.users
FOR UPDATE  
TO authenticated
USING (auth.uid() = id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = id AND auth.uid() IS NOT NULL);

-- Keep the anonymous block policy (critical for security)
-- Keep service role access (needed for system operations)

-- 2. PAYMENTS TABLE SECURITY FIX  
-- Simplify payment policies while preserving payment flow functionality

-- Drop redundant payment policies
DROP POLICY IF EXISTS "users_create_own_payments_enhanced" ON public.payments;

-- Keep essential policies:
-- - users_create_own_payments_strict (for payment creation)
-- - users_view_own_payments_strict (for user payment viewing) 
-- - service_role_manage_payments_strict (for webhook/system operations)
-- - block_payment_deletes (security - no deletes)
-- - block_user_payment_updates (security - no user updates)

-- Add explicit policy to ensure only authenticated users can create payments
CREATE POLICY "payments_authenticated_create_only" ON public.payments
FOR INSERT  
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Block all anonymous access to payments (additional security layer)
CREATE POLICY "payments_block_anonymous" ON public.payments  
FOR ALL
TO anon
USING (false);

-- Log the security fixes
INSERT INTO public.security_audit_log (
  user_id, action, table_name, accessed_user_id, ip_address
) VALUES (
  NULL, 'SECURITY_FIX: Secured users and payments tables', 'users,payments', NULL, NULL
);