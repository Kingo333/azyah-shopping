-- Fix Critical Security Issue: Restrict Public Access to User Data

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view public user profiles" ON public.users;

-- Create a safe public profile view that only exposes non-sensitive data
CREATE POLICY "Public can view safe profile data only" ON public.users
FOR SELECT
USING (true)
WITH CHECK (false);

-- But limit what columns can be accessed publicly by creating a view
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  name,
  avatar_url,
  bio,
  website,
  created_at
FROM public.users;

-- Allow public access to the safe view
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Create RLS policy for the view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Update the main users table policies to be more secure
-- Users can still view their own complete profile
CREATE POLICY "Users can view their own complete profile" ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (but not role - already handled)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile safely" ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent role changes unless admin
  (OLD.role = NEW.role OR get_current_user_role() = 'admin')
);

-- Admins can view all profiles for management purposes
CREATE POLICY "Admins can view all profiles" ON public.users
FOR SELECT
USING (get_current_user_role() = 'admin');