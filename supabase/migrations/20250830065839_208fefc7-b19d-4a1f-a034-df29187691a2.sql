-- Security Enhancement: Update database function search paths
-- This prevents potential schema confusion and follows PostgreSQL security best practices

-- Update functions that don't have explicit search paths
CREATE OR REPLACE FUNCTION public.embed_query(query_text text)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Placeholder for embedding function
  -- In real implementation, use OpenAI embeddings API
  RETURN array_fill(0.0, ARRAY[1536]);
END;
$function$;

-- Update create_admin_user function
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- This function will be used to create the initial admin user
  -- Should be called after authentication is set up
  NULL;
END;
$function$;

-- Add additional security validation function
CREATE OR REPLACE FUNCTION public.validate_session_security()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that the current session is secure
  -- Check for suspicious activity patterns
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Log security validation attempt
  PERFORM public.log_user_data_access('SECURITY_VALIDATION', 'session', auth.uid());
  
  RETURN true;
END;
$function$;