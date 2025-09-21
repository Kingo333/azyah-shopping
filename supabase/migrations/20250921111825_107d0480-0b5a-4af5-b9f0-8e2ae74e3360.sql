-- Security Fix: Remove overly permissive RLS policies on users table
-- This fixes the security vulnerability where user data could be publicly accessible

-- Drop the existing permissive policies that may allow broader access
DROP POLICY IF EXISTS "users_block_anonymous_access" ON public.users;
DROP POLICY IF EXISTS "users_own_data_only" ON public.users;
DROP POLICY IF EXISTS "users_secure_create" ON public.users;
DROP POLICY IF EXISTS "users_secure_read" ON public.users;
DROP POLICY IF EXISTS "users_secure_update" ON public.users;

-- Create strict, secure RLS policies that only allow users to access their own data
-- Policy for SELECT: Users can only view their own profile data
CREATE POLICY "users_can_view_own_data_only" 
ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy for INSERT: Allow authenticated users to create their own profile
-- This is needed for user registration flow
CREATE POLICY "users_can_create_own_profile" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy for UPDATE: Users can only update their own data
CREATE POLICY "users_can_update_own_data_only" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for DELETE: Users can delete their own account (optional, usually handled by auth)
CREATE POLICY "users_can_delete_own_account" 
ON public.users 
FOR DELETE 
TO authenticated
USING (auth.uid() = id);

-- Keep the system policy for service role operations (needed for triggers/functions)
-- This allows database functions to create user records during signup
CREATE POLICY "system_can_manage_users" 
ON public.users 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;