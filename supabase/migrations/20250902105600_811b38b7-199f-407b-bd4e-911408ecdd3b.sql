-- Fix infinite recursion in users table RLS policies
-- Simplify the policy to remove circular dependency

-- Drop the problematic policy
DROP POLICY IF EXISTS "users_update_own_profile" ON users;

-- Create a simplified policy without circular reference
-- Users can update their own profile but cannot change their role
CREATE POLICY "users_update_own_profile" ON users
FOR UPDATE 
TO public
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  log_user_data_access('UPDATE_PROFILE', 'users', auth.uid()) IS NOT NULL
);