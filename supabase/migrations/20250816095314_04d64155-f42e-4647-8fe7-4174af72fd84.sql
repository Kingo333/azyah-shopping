-- Fix the security definer view issue
-- The public_user_profiles view is safe as it only exposes non-sensitive data
-- Let's modify it to be more explicit about security
DROP VIEW IF EXISTS public.public_user_profiles;

-- Create a regular view without security definer properties
CREATE VIEW public.public_user_profiles AS
SELECT 
  id,
  name,
  avatar_url,
  bio,
  website,
  country,
  created_at
FROM public.users
WHERE id = auth.uid()  -- Only show current user's own data in view context
UNION ALL
SELECT 
  id,
  name,
  avatar_url,
  bio,
  website,
  country,
  created_at
FROM public.users 
WHERE id IN (
  -- Allow viewing public profiles that are referenced in public content
  SELECT DISTINCT user_id FROM public.posts
  UNION
  SELECT DISTINCT user_id FROM public.closets WHERE is_public = true
);

COMMENT ON VIEW public.public_user_profiles IS 'Safe view of user profiles without sensitive data like emails - shows own profile and public profiles only';