-- CRITICAL SECURITY FIX: Prevent role escalation and fix RLS policies

-- 1. Create audit log table for role changes
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_role user_role,
  new_role user_role NOT NULL,
  changed_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view role audit logs" 
ON public.role_audit_log 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- System can insert audit logs
CREATE POLICY "System can insert role audit logs" 
ON public.role_audit_log 
FOR INSERT 
WITH CHECK (auth.uid() = changed_by OR auth.role() = 'service_role');

-- 2. Create secure admin-only role update function
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role user_role,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
  old_role user_role;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role FROM public.users WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Get current role of target user
  SELECT role INTO old_role FROM public.users WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Update the role
  UPDATE public.users 
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the change
  INSERT INTO public.role_audit_log (user_id, old_role, new_role, changed_by, reason)
  VALUES (target_user_id, old_role, new_role, auth.uid(), reason);
  
  RETURN TRUE;
END;
$$;

-- 3. Fix users table RLS policies - remove overlapping policies and secure role updates
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;

-- Create new secure policies
CREATE POLICY "Users can view their own profile data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile (except role)" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent role changes by regular users
  (OLD.role = NEW.role OR get_current_user_role() = 'admin')
);

CREATE POLICY "System can create user profiles" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- 4. Fix events table RLS - ensure users can only see their own events
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;

CREATE POLICY "Users can view only their own events" 
ON public.events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events" 
ON public.events 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- 5. Fix swipes table RLS - ensure users can only see their own swipes
DROP POLICY IF EXISTS "Users can view their own swipes" ON public.swipes;

CREATE POLICY "Users can view only their own swipes" 
ON public.swipes 
FOR SELECT 
USING (auth.uid() = user_id);

-- 6. Fix security definer function with proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 7. Create function to validate role update attempts
CREATE OR REPLACE FUNCTION public.validate_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role is being changed and user is not admin, block it
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF get_current_user_role() != 'admin' AND auth.uid() = NEW.id THEN
      RAISE EXCEPTION 'Access denied: Cannot modify your own role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to prevent role self-modification
DROP TRIGGER IF EXISTS validate_role_update_trigger ON public.users;
CREATE TRIGGER validate_role_update_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_update();