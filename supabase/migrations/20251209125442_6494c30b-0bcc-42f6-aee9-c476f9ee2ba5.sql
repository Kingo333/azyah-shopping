-- Remove the problematic policy that exposes all user data publicly
DROP POLICY IF EXISTS "Public can view safe profile fields" ON public.users;

-- Verify the remaining policies are secure (owner-only access)
-- The existing "users_can_view_own_data_only" policy with (auth.uid() = id) is correct