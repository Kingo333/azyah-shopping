-- Fix the remaining function search path issue
-- Update the create_admin_user function
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function will be used to create the initial admin user
  -- Should be called after authentication is set up
  NULL;
END;
$$;