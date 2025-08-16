-- Additional security hardening for users table access
-- The scanner suggests the table might be accessible without authentication

-- Step 1: Strengthen existing policies with additional authentication checks
DROP POLICY IF EXISTS "Users can view only their own profile data" ON public.users;
DROP POLICY IF EXISTS "Users can update only their own profile data" ON public.users;

-- Create enhanced policies with explicit authentication requirements
CREATE POLICY "Authenticated users can view only their own profile data"
ON public.users
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

CREATE POLICY "Authenticated users can update only their own profile data"
ON public.users
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Step 2: Explicitly deny all other access
CREATE POLICY "Deny all anonymous access to users"
ON public.users
FOR ALL
TO anon
USING (false);

-- Step 3: Create a secure function for user profile access that includes audit logging
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_avatar_url TEXT,
  user_bio TEXT,
  user_country TEXT,
  user_website TEXT,
  user_role user_role,
  user_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Log access attempt
  PERFORM public.log_user_data_access('VIEW_OWN_PROFILE', 'users', auth.uid());
  
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
  WHERE u.id = auth.uid();
END;
$$;

-- Step 4: Ensure the users table has explicit RLS enforcement
-- (This is already enabled, but making it explicit)
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;