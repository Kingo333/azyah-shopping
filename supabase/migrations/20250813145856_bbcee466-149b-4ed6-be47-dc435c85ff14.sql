-- Phase 1: Critical Role Security Fixes

-- Create a security definer function to safely check user roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create policy to prevent role changes by regular users
CREATE POLICY "Prevent role escalation" ON public.users
FOR UPDATE 
USING (
  -- Users can update their profile but not their role
  auth.uid() = id AND 
  (OLD.role = NEW.role OR get_current_user_role() = 'admin')
);

-- Create admin-only policy for role management
CREATE POLICY "Admins can manage user roles" ON public.users
FOR UPDATE
USING (get_current_user_role() = 'admin');

-- Update categories policy to prevent recursion
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL
USING (get_current_user_role() = 'admin');

-- Secure events table - require authentication for creating events
DROP POLICY IF EXISTS "Anyone can create events" ON public.events;
CREATE POLICY "Authenticated users can create events" ON public.events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.user_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role user_role,
  new_role user_role NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  reason text
);

-- Enable RLS on audit table
ALTER TABLE public.user_role_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role audit logs" ON public.user_role_audit
FOR SELECT
USING (get_current_user_role() = 'admin');

-- Create trigger function for role change auditing
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.user_role_audit (user_id, old_role, new_role, changed_by)
    VALUES (NEW.id, OLD.role, NEW.role, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change auditing
DROP TRIGGER IF EXISTS audit_user_role_changes ON public.users;
CREATE TRIGGER audit_user_role_changes
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();