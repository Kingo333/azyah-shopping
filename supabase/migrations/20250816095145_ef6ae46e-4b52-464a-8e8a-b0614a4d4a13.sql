-- Fix security warnings: Update functions to have secure search paths
-- Fix the get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Fix the admin_get_user_data function  
CREATE OR REPLACE FUNCTION public.admin_get_user_data(user_id_param UUID)
RETURNS SETOF public.users 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if current user is admin
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.users WHERE id = user_id_param;
END;
$$;