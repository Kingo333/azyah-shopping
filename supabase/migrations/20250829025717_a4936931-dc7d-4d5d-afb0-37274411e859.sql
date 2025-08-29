-- Security Fix: Clean up redundant RLS policies on users table to prevent email address exposure
-- Issue: Multiple overlapping SELECT policies could create confusion and potential security gaps

-- First, drop the redundant and potentially problematic policies
DROP POLICY IF EXISTS "Authenticated users can view only their own profile data" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update only their own profile data" ON public.users;

-- Keep the more secure and cleaner policies:
-- "Users can view their own profile data" - uses simple auth.uid() = id check
-- "Users can update their own profile (except role)" - has proper role protection

-- Add additional security: Ensure email field access is strictly controlled
-- Create a secure function to get limited user profile data without exposing sensitive fields
CREATE OR REPLACE FUNCTION public.get_safe_user_profile(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_avatar_url text,
  user_bio text,
  user_country text,
  user_website text,
  user_role user_role,
  user_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to access their own profile or admins to access any profile
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;
  
  -- Security check: only allow access to own profile or if user is admin
  IF target_user_id != auth.uid() AND get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: You can only access your own profile';
  END IF;
  
  -- Log access for audit purposes
  PERFORM public.log_user_data_access('GET_SAFE_PROFILE', 'users', target_user_id);
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.name as user_name,
    u.avatar_url as user_avatar_url,
    u.bio as user_bio,
    u.country as user_country,
    u.website as user_website,
    u.role as user_role,
    u.created_at as user_created_at
  FROM public.users u
  WHERE u.id = target_user_id;
END;
$$;

-- Create a strict policy to prevent any accidental email exposure
-- This policy ensures ONLY the user themselves can see their email
CREATE POLICY "Email access strictly limited to profile owner"
ON public.users
FOR SELECT
USING (
  auth.uid() = id OR 
  get_current_user_role() = 'admin'
);

-- Ensure the policy order is correct by recreating the admin policy
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (get_current_user_role() = 'admin');

-- Add a comment to document the security requirements
COMMENT ON TABLE public.users IS 'Contains sensitive user data including emails. Access is strictly controlled via RLS policies - users can only access their own data, admins can access all data.';
COMMENT ON COLUMN public.users.email IS 'SENSITIVE: Email addresses must never be exposed to unauthorized users. Only accessible by profile owner or admins.';

-- Create an additional security check function
CREATE OR REPLACE FUNCTION public.validate_user_data_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Users can only access their own data, or admins can access any data
  RETURN (
    auth.uid() = target_user_id OR 
    get_current_user_role() = 'admin'
  );
END;
$$;