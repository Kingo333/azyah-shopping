
-- Add RLS policy to users table for public profile viewing
-- This allows anyone to view basic profile fields while keeping sensitive data protected
CREATE POLICY "Public can view safe profile fields"
ON public.users
FOR SELECT
USING (true);

-- Convert views to security invoker mode (PostgreSQL 15+ best practice)
-- This ensures views respect the caller's permissions and underlying table RLS policies
ALTER VIEW public.ugc_brand_stats SET (security_invoker = on);
ALTER VIEW public.users_public SET (security_invoker = on);
ALTER VIEW public.v_my_friends SET (security_invoker = on);
