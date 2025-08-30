-- CRITICAL SECURITY FIX: Secure User Data Access Control
-- This migration fixes conflicting policies and implements proper user data protection

-- Step 1: Drop all conflicting and problematic policies
DROP POLICY IF EXISTS "Admins can access user data through secure function only" ON public.users;
DROP POLICY IF EXISTS "Deny all anonymous access to users" ON public.users;
DROP POLICY IF EXISTS "System can create user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.users;
DROP POLICY IF EXISTS "Users can view their own basic profile data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile data" ON public.users;

-- Step 2: Create secure, non-conflicting policies with clear separation

-- Policy 1: Block ALL anonymous access to user data
CREATE POLICY "block_anonymous_access" ON public.users
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Policy 2: Users can only view their own profile data (with audit logging)
CREATE POLICY "users_view_own_profile" ON public.users
  FOR SELECT
  TO public
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id 
    AND (SELECT log_user_data_access('VIEW_OWN_PROFILE', 'users', auth.uid())) IS NOT NULL
  );

-- Policy 3: Users can insert their own profile only (secure creation)
CREATE POLICY "users_create_own_profile" ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND (SELECT log_user_data_access('CREATE_PROFILE', 'users', auth.uid())) IS NOT NULL
  );

-- Policy 4: System can create user profiles (for auth triggers)
CREATE POLICY "system_create_profiles" ON public.users
  FOR INSERT
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 5: Users can update their own profile (excluding role field)
CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE
  TO public
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND role = (SELECT u.role FROM users u WHERE u.id = auth.uid())
    AND (SELECT log_user_data_access('UPDATE_PROFILE', 'users', auth.uid())) IS NOT NULL
  );

-- Policy 6: Service role full access (for system operations)
CREATE POLICY "service_role_full_access" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Create secure admin access function with mandatory justification
CREATE OR REPLACE FUNCTION public.admin_access_user_profile(
  target_user_id uuid, 
  justification text
)
RETURNS TABLE(
  user_id uuid, 
  user_email text, 
  user_name text, 
  user_role user_role,
  user_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin role
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required for user profile access';
  END IF;
  
  -- Require detailed justification
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 15 THEN
    RAISE EXCEPTION 'Admin access requires detailed justification (minimum 15 characters)';
  END IF;
  
  -- Log admin access with justification
  PERFORM public.log_admin_access_with_justification(
    'ADMIN_ACCESS_USER_PROFILE', 
    'users', 
    target_user_id,
    justification
  );
  
  -- Return limited, essential user data only
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at
  FROM public.users u
  WHERE u.id = target_user_id;
END;
$function$;

-- Step 4: Create secure user data validation function
CREATE OR REPLACE FUNCTION public.validate_user_profile_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
    RETURN false;
  END IF;
  
  -- Validate access patterns
  RETURN (
    -- User accessing their own data
    auth.uid() = target_user_id OR 
    -- Admin with proper role
    public.get_current_user_role() = 'admin' OR
    -- Service role for system operations
    auth.role() = 'service_role'
  );
END;
$function$;

-- Step 5: Create secure email access function (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_user_email(
  target_user_id uuid,
  justification text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
BEGIN
  -- Verify admin role
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required for email access';
  END IF;
  
  -- Require justification for email access
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 20 THEN
    RAISE EXCEPTION 'Email access requires detailed justification (minimum 20 characters)';
  END IF;
  
  -- Log email access attempt
  PERFORM public.log_admin_access_with_justification(
    'ADMIN_ACCESS_USER_EMAIL', 
    'users', 
    target_user_id,
    justification
  );
  
  -- Get email securely
  SELECT email INTO user_email 
  FROM public.users 
  WHERE id = target_user_id;
  
  RETURN user_email;
END;
$function$;

-- Step 6: Add security constraints
ALTER TABLE public.users 
ADD CONSTRAINT users_email_not_empty 
CHECK (email IS NOT NULL AND LENGTH(TRIM(email)) > 0);

-- Create secure indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_id_role 
ON public.users(id, role) 
WHERE id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_secure 
ON public.users(email) 
WHERE email IS NOT NULL;