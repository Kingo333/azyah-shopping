-- CRITICAL SECURITY FIX: Secure Events Table Access Control (Correct Types)
-- This migration implements comprehensive RLS policies for the events table
-- to prevent unauthorized access to sensitive user tracking data

-- Step 1: Enable RLS on events table if not already enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing conflicting policies
DROP POLICY IF EXISTS "Anonymous users cannot access events" ON public.events;
DROP POLICY IF EXISTS "Users can view their own events only" ON public.events;
DROP POLICY IF EXISTS "Service role can manage events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "block_anonymous_events_access" ON public.events;
DROP POLICY IF EXISTS "users_view_own_events" ON public.events;
DROP POLICY IF EXISTS "users_create_own_events" ON public.events;
DROP POLICY IF EXISTS "service_role_events_access" ON public.events;
DROP POLICY IF EXISTS "restrict_events_updates" ON public.events;
DROP POLICY IF EXISTS "restrict_events_deletes" ON public.events;

-- Step 3: Block ALL anonymous access to events table
CREATE POLICY "block_anonymous_events_access" ON public.events
  FOR ALL
  TO anon
  USING (false);

-- Step 4: Users can only view their own event data (correct uuid comparison)
CREATE POLICY "users_view_own_events" ON public.events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- Step 5: Only authenticated users can create events for themselves (correct uuid comparison)
CREATE POLICY "users_create_own_events" ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- Step 6: Service role has full access for system operations
CREATE POLICY "service_role_events_access" ON public.events
  FOR ALL
  TO service_role
  USING (true);

-- Step 7: Prevent unauthorized updates and deletes for data integrity
CREATE POLICY "restrict_events_updates" ON public.events
  FOR UPDATE
  TO authenticated
  USING (false); -- No updates allowed for security

CREATE POLICY "restrict_events_deletes" ON public.events
  FOR DELETE
  TO authenticated
  USING (false); -- No deletes allowed for security

-- Step 8: Add data retention function for privacy compliance
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS TABLE(deleted_count integer, cleanup_summary text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cutoff_time TIMESTAMP WITH TIME ZONE;
  events_deleted INTEGER := 0;
BEGIN
  -- Calculate cutoff time (90 days ago for data retention)
  cutoff_time := NOW() - INTERVAL '90 days';
  
  -- Log the cleanup start
  RAISE LOG 'Starting events cleanup for records older than %', cutoff_time;
  
  -- Delete old events for privacy compliance
  DELETE FROM public.events 
  WHERE created_at < cutoff_time;
  
  GET DIAGNOSTICS events_deleted = ROW_COUNT;
  RAISE LOG 'Deleted % old events records', events_deleted;
  
  -- Return cleanup results
  RETURN QUERY SELECT 
    events_deleted,
    FORMAT('Events cleanup completed: %s records deleted at %s', 
           events_deleted, NOW());
           
  -- Log completion
  RAISE LOG 'Events cleanup completed: % events deleted', events_deleted;
END;
$function$;

-- Step 9: Create secure event access validation function
CREATE OR REPLACE FUNCTION public.validate_event_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to access their own events or admins
  RETURN (
    target_user_id = auth.uid() OR 
    public.get_current_user_role() = 'admin' OR
    auth.role() = 'service_role'
  );
END;
$function$;

-- Step 10: Add security constraints and indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_id_secure 
ON public.events(user_id, created_at) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_created_at_cleanup 
ON public.events(created_at) 
WHERE created_at IS NOT NULL;