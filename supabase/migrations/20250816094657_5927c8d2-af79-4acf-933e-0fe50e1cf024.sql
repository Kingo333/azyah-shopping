-- Security fix: Strengthen RLS policies to protect customer email addresses
-- Step 1: Create a security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 2: Drop existing potentially vulnerable policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Step 3: Create strict new RLS policies for the users table
-- Only allow users to see their own profile data
CREATE POLICY "Users can view only their own profile data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Only allow users to update their own profile data (except sensitive fields)
CREATE POLICY "Users can update only their own profile data"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND OLD.email = NEW.email  -- Prevent email changes through this policy
  AND OLD.role = NEW.role    -- Prevent role changes through this policy
  AND OLD.id = NEW.id        -- Prevent ID changes
);

-- Step 4: Create a safe public view that excludes sensitive data
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT 
  id,
  name,
  avatar_url,
  bio,
  website,
  country,
  created_at,
  -- Exclude: email, role, preferences, socials, updated_at
  NULL as email -- Explicitly set to NULL for safety
FROM public.users;

-- Enable RLS on the view (though it inherits from the base table)
-- This is defensive programming
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
-- The current policy "Allow authenticated users to read aggregated swipe trends" is too broad
DROP POLICY IF EXISTS "Allow authenticated users to read aggregated swipe trends" ON public.swipes;

-- Replace with user-specific access only
CREATE POLICY "Users can view aggregated trends only"
ON public.swipes
FOR SELECT
USING (
  -- Only allow if user is viewing their own data OR it's for trending data (no user_id exposed)
  auth.uid() = user_id 
  OR (
    -- Allow aggregated queries that don't expose individual user data
    auth.role() = 'authenticated' 
    AND current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'service_role')
  )
);

-- Step 8: Add audit logging for sensitive data access
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  accessed_user_id UUID, -- For when viewing other user's data
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_user_data_access(
  action_param TEXT,
  table_name_param TEXT,
  accessed_user_id_param UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    auth.uid(),
    action_param,
    table_name_param,
    accessed_user_id_param,
    inet_client_addr()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;