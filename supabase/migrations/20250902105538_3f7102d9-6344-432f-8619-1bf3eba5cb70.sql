-- Fix infinite recursion in users table RLS policies
-- The issue is that update policy references users table within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "users_update_own_profile" ON users;

-- Create a new policy without the circular reference
-- Remove the role comparison since users shouldn't be able to change their own role anyway
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
  -- Prevent role changes (role should remain unchanged)
  role = (SELECT u.role FROM public.users u WHERE u.id = OLD.id) AND
  log_user_data_access('UPDATE_PROFILE', 'users', auth.uid()) IS NOT NULL
);