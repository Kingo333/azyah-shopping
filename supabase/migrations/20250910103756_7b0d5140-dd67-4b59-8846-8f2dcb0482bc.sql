-- Step 1: Delete existing admin user
DELETE FROM public.users WHERE email = 'admin@test.com';

-- Step 2: Update RLS policies to restrict admin access to service_role only
-- Update brands policy
DROP POLICY IF EXISTS "Brand owners and admins only" ON public.brands;
CREATE POLICY "Brand owners and admins only" ON public.brands
FOR SELECT 
USING ((auth.uid() = owner_user_id) OR (auth.role() = 'service_role'::text));

-- Update categories policy  
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Service role can manage categories" ON public.categories
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Update events policy
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Service role can view all events" ON public.events
FOR SELECT 
USING (auth.role() = 'service_role'::text);

-- Update retailers policy
DROP POLICY IF EXISTS "Retailer owners and admins only" ON public.retailers;
CREATE POLICY "Retailer owners and service role only" ON public.retailers
FOR SELECT 
USING ((auth.uid() = owner_user_id) OR (auth.role() = 'service_role'::text));

-- Step 3: Update database functions to use service_role instead of admin role check
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  -- Only return role for authenticated users, never admin for regular users
  SELECT CASE 
    WHEN auth.role() = 'service_role'::text THEN 'admin'::user_role
    ELSE COALESCE(role, 'shopper'::user_role)
  END FROM public.users WHERE id = auth.uid();
$function$;

-- Update admin functions to only work in service_role context
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, new_role user_role, reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_role user_role;
BEGIN
  -- Check if current context is service_role
  IF auth.role() != 'service_role'::text THEN
    RAISE EXCEPTION 'Access denied: Service role required';
  END IF;
  
  -- Get current role of target user
  SELECT role INTO old_role FROM public.users WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Prevent setting admin role for regular users
  IF new_role = 'admin'::user_role THEN
    RAISE EXCEPTION 'Admin role cannot be assigned to users';
  END IF;
  
  -- Update the role
  UPDATE public.users 
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the change
  INSERT INTO public.role_audit_log (user_id, old_role, new_role, changed_by, reason)
  VALUES (target_user_id, old_role, new_role, '00000000-0000-0000-0000-000000000000'::uuid, reason);
  
  RETURN TRUE;
END;
$function$;

-- Add constraint to prevent manual admin role assignment
ALTER TABLE public.users ADD CONSTRAINT prevent_admin_role_assignment 
CHECK (role != 'admin'::user_role OR auth.role() = 'service_role'::text);