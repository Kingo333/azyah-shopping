-- Fix critical security vulnerabilities in users and payments tables

-- First, let's secure the users table with proper RLS policies
-- Drop existing problematic policies and create secure ones

-- Remove overly permissive service role access for users table
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;

-- Create secure policies for users table
DROP POLICY IF EXISTS "block_anonymous_users_access" ON public.users;

-- Users can only view and update their own data
CREATE POLICY "users_own_data_only" ON public.users
  FOR ALL 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Block all anonymous access to users table
CREATE POLICY "users_block_anonymous_access" ON public.users
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Fix payments table security issues
-- Remove overly broad service role access
DROP POLICY IF EXISTS "service_role_manage_payments_strict" ON public.payments;

-- Create more restrictive service role policy only for webhook updates
CREATE POLICY "service_role_webhook_updates_only" ON public.payments
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (
    auth.role() = 'service_role' 
    AND status IN ('succeeded', 'failed', 'canceled', 'processing')
  );

-- Ensure payments policies are properly restrictive
DROP POLICY IF EXISTS "payments_block_anonymous" ON public.payments;

-- Create comprehensive anonymous blocking policy
CREATE POLICY "payments_strict_anonymous_block" ON public.payments
  FOR ALL
  USING (false);

-- Ensure only payment owners can access their payment data
DROP POLICY IF EXISTS "users_view_own_payments_strict" ON public.payments;

CREATE POLICY "payments_owner_access_only" ON public.payments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- Users can only create payments for themselves
DROP POLICY IF EXISTS "users_create_own_payments_strict" ON public.payments;
DROP POLICY IF EXISTS "payments_authenticated_create_only" ON public.payments;

CREATE POLICY "payments_create_own_only" ON public.payments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- Add additional security for sensitive user data access
-- Create audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  table_name TEXT,
  user_id_accessed UUID,
  access_type TEXT
) RETURNS VOID AS $$
BEGIN
  -- Only log if not in read-only transaction
  IF NOT public.__is_read_only_tx() THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      accessed_user_id,
      ip_address
    ) VALUES (
      auth.uid(),
      access_type || '_SENSITIVE_DATA',
      table_name,
      user_id_accessed,
      inet_client_addr()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create secure function for user profile access with logging
CREATE OR REPLACE FUNCTION public.get_user_profile_secure(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  role user_role,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Only allow users to access their own profile
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Access denied: Users can only access their own profile data';
  END IF;
  
  -- Log the access attempt
  PERFORM public.log_sensitive_data_access('users', target_user_id, 'PROFILE_ACCESS');
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.avatar_url,
    u.role,
    u.country,
    u.created_at
  FROM public.users u
  WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;