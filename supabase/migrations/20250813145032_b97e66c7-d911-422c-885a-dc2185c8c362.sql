-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view public user profiles" ON public.users;

-- Create a new policy that only exposes safe public profile data
CREATE POLICY "Public can view safe profile data" ON public.users
FOR SELECT 
USING (true)
WITH CHECK (false);

-- But we need to be more granular. Let's create a view for public profiles instead
-- and update the policy to be more restrictive

-- First, let's make the users table completely private
DROP POLICY IF EXISTS "Public can view safe profile data" ON public.users;

-- Create a policy that only allows users to see their own data
CREATE POLICY "Users can only view their own profile" ON public.users
FOR SELECT 
USING (auth.uid() = id);

-- Create a separate view for public profile data that only exposes safe information
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  name,
  avatar_url,
  bio,
  website,
  country,
  created_at
FROM public.users
WHERE id IS NOT NULL;

-- Enable RLS on the view (though views inherit from underlying tables)
-- The view will only show data that the underlying RLS policies allow

-- Grant access to the public_profiles view
GRANT SELECT ON public.public_profiles TO authenticated, anon;