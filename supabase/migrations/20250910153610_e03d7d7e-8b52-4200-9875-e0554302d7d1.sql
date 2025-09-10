-- Fix conflicting RLS policies on events table to prevent unauthorized access to user activity data

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Service can create events" ON public.events;
DROP POLICY IF EXISTS "Service role can view all events" ON public.events;
DROP POLICY IF EXISTS "Users can view only their own events" ON public.events;
DROP POLICY IF EXISTS "block_anonymous_events_access" ON public.events;
DROP POLICY IF EXISTS "restrict_events_deletes" ON public.events;
DROP POLICY IF EXISTS "restrict_events_updates" ON public.events;
DROP POLICY IF EXISTS "service_role_events_limited" ON public.events;
DROP POLICY IF EXISTS "users_create_own_events" ON public.events;
DROP POLICY IF EXISTS "users_view_own_events" ON public.events;

-- Create clean, secure, non-conflicting RLS policies

-- 1. Users can only view their own events (strict user data isolation)
CREATE POLICY "users_view_own_events_only" 
ON public.events 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can only create events for themselves (prevent data poisoning)
CREATE POLICY "users_create_own_events_only" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Service role can manage all events (for system operations and cleanup)
CREATE POLICY "service_role_full_access" 
ON public.events 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Block all anonymous access (prevent unauthorized data exposure)
CREATE POLICY "block_anonymous_access" 
ON public.events 
FOR ALL 
TO anon
USING (false);

-- 5. Block updates and deletes for authenticated users (preserve data integrity)
CREATE POLICY "block_user_modifications" 
ON public.events 
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "block_user_deletions" 
ON public.events 
FOR DELETE 
TO authenticated
USING (false);