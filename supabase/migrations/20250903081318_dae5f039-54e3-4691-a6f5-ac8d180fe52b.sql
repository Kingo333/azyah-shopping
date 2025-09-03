-- Fix function search path issues for security
CREATE OR REPLACE FUNCTION public.__is_read_only_tx()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_setting('transaction_read_only')::boolean;
$$;

-- Create a function to safely log admin access with justification
CREATE OR REPLACE FUNCTION public.log_admin_access_with_justification(
  action_type text, 
  table_name text, 
  accessed_user_id uuid, 
  justification text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if current user is admin
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Require meaningful justification
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 10 THEN
    RAISE EXCEPTION 'Admin access requires detailed justification (minimum 10 characters)';
  END IF;
  
  -- Log the access with enhanced details
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    table_name, 
    accessed_user_id, 
    ip_address
  ) VALUES (
    auth.uid(),
    action_type || ' - JUSTIFICATION: ' || justification,
    table_name,
    accessed_user_id,
    inet_client_addr()
  );
END;
$$;

-- Update log_user_data_access function to have proper search path
CREATE OR REPLACE FUNCTION public.log_user_data_access(action_type text, table_name text, accessed_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip logging in read-only transactions to prevent issues
  IF public.__is_read_only_tx() THEN
    RETURN;
  END IF;

  -- Log the data access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, accessed_user_id, ip_address
  ) VALUES (
    auth.uid(), action_type, table_name, accessed_user_id, inet_client_addr()
  );
END;
$$;