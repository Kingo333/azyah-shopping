-- Security fix: Strengthen RLS policies to protect customer email addresses
-- Step 1: Create a security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 2: Drop existing potentially vulnerable policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Step 3: Create strict new RLS policies for the users table
-- Only allow users to see their own profile data
CREATE POLICY "Users can view only their own profile data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Only allow users to update their own profile data
CREATE POLICY "Users can update only their own profile data"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- Step 4: Create a safe public view that excludes sensitive data
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT 
  id,
  name,
  avatar_url,
  bio,
  website,
  country,
  created_at
FROM public.users;

COMMENT ON VIEW public.public_user_profiles IS 'Safe view of user profiles without sensitive data like emails';

-- Step 5: Create a function for admin access to user data (if needed)
CREATE OR REPLACE FUNCTION public.admin_get_user_data(user_id_param UUID)
RETURNS SETOF public.users AS $$
BEGIN
  -- Only allow if current user is admin
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.users WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Ensure events table is properly secured
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Anyone can create events" ON public.events;
DROP POLICY IF EXISTS "Brands can view events for their products" ON public.events;
DROP POLICY IF EXISTS "Retailers can view events for their products" ON public.events;

-- Create strict event policies
CREATE POLICY "Service can create events"
ON public.events
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
ON public.events
FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- Step 7: Fix swipes table policies to be more restrictive
-- Drop all existing swipe policies first
DROP POLICY IF EXISTS "Allow authenticated users to read aggregated swipe trends" ON public.swipes;
DROP POLICY IF EXISTS "Users can create their own swipes" ON public.swipes;
DROP POLICY IF EXISTS "Users can update their own swipes" ON public.swipes;
DROP POLICY IF EXISTS "Users can view their own swipes" ON public.swipes;

-- Recreate with proper restrictions
CREATE POLICY "Users can create their own swipes"
ON public.swipes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own swipes"
ON public.swipes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own swipes"
ON public.swipes
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role for trending data functions only
CREATE POLICY "Allow service role for trending data"
ON public.swipes
FOR SELECT
USING (auth.role() = 'service_role');

-- Step 8: Add audit logging for sensitive data access
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  accessed_user_id UUID,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (public.get_current_user_role() = 'admin');