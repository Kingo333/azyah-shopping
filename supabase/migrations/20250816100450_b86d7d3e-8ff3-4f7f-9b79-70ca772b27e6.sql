-- Fix the public_profiles table security issue
-- The table currently allows unrestricted public access, which is too permissive

-- Step 1: Add a privacy control column to allow users to control their visibility
ALTER TABLE public.public_profiles 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Update existing RLS policy to respect privacy settings
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.public_profiles;

-- Create new restrictive policies
CREATE POLICY "Users can view their own profile"
ON public.public_profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Anyone can view profiles marked as public"
ON public.public_profiles
FOR SELECT
USING (is_public = true);

-- Step 3: Ensure users can update their own profile visibility
CREATE POLICY "Users can update their own profile visibility"
ON public.public_profiles
FOR UPDATE
USING (id = auth.uid());

-- Step 4: Create a safe function to get public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  website TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access attempt for audit purposes
  PERFORM public.log_user_data_access('VIEW_PUBLIC_PROFILE', 'public_profiles', profile_user_id);
  
  RETURN QUERY
  SELECT 
    pp.id as user_id,
    pp.name as display_name,
    pp.avatar_url,
    pp.bio,
    pp.country,
    pp.website,
    pp.created_at
  FROM public.public_profiles pp
  WHERE pp.id = profile_user_id 
  AND (pp.is_public = true OR pp.id = auth.uid());
END;
$$;