-- Remove the view that's causing security definer issues
-- Since we have the existing public_profiles table, we don't need the duplicate view
DROP VIEW IF EXISTS public.public_user_profiles;

-- The public_profiles table already serves this purpose safely
-- It has proper RLS policies and only contains non-sensitive data