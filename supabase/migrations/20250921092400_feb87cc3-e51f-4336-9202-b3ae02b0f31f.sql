-- Fix the overly restrictive RLS policy on users table
-- Drop the problematic policy that blocks ALL access with false condition
DROP POLICY IF EXISTS "block_anonymous_access" ON public.users;

-- Create a more targeted policy that specifically blocks anonymous access to users table
-- This policy only affects the anon role and doesn't interfere with authenticated access
CREATE POLICY "block_anonymous_users_access" ON public.users
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Ensure authenticated users can still access their own data with existing policies:
-- - users_secure_read: allows authenticated users to read their own data
-- - users_secure_update: allows authenticated users to update their own data  
-- - users_secure_create: allows authenticated users to create their own profile

-- Add a comment for clarity
COMMENT ON POLICY "block_anonymous_users_access" ON public.users IS 
'Blocks all anonymous access to users table while preserving authenticated user access through other policies';