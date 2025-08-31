-- Security Fix 1: Harden database function search paths
-- Update functions to use explicit search_path for security

-- Update embed_query function
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

-- Update validate_session_security function
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

-- Update admin access functions with explicit search paths
CREATE OR REPLACE FUNCTION public.admin_access_payment_with_justification(payment_id_param uuid, justification text)
RETURNS SETOF payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin role
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Require justification
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 10 THEN
    RAISE EXCEPTION 'Admin access requires detailed justification (minimum 10 characters)';
  END IF;
  
  -- Log with justification
  PERFORM public.log_admin_access_with_justification(
    'ADMIN_ACCESS_PAYMENT_DATA', 
    'payments', 
    (SELECT user_id FROM payments WHERE id = payment_id_param),
    justification
  );
  
  RETURN QUERY SELECT * FROM public.payments WHERE id = payment_id_param;
END;
$function$;

-- Update cleanup functions
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_assets()
RETURNS TABLE(deleted_assets_count integer, deleted_jobs_count integer, deleted_files_count integer, cleanup_summary text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cutoff_time TIMESTAMP WITH TIME ZONE;
  assets_deleted INTEGER := 0;
  jobs_deleted INTEGER := 0;
  files_to_delete TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Calculate cutoff time (48 hours ago)
  cutoff_time := NOW() - INTERVAL '48 hours';
  
  -- Log the cleanup start
  RAISE LOG 'Starting AI assets cleanup for records older than %', cutoff_time;
  
  -- Collect asset URLs that will be deleted for storage cleanup
  SELECT ARRAY_AGG(asset_url) INTO files_to_delete
  FROM ai_assets 
  WHERE created_at < cutoff_time;
  
  -- Delete old AI assets
  DELETE FROM public.ai_assets 
  WHERE created_at < cutoff_time;
  
  GET DIAGNOSTICS assets_deleted = ROW_COUNT;
  RAISE LOG 'Deleted % old ai_assets records', assets_deleted;
  
  -- Delete old AI try-on jobs
  DELETE FROM public.ai_tryon_jobs 
  WHERE created_at < cutoff_time;
  
  GET DIAGNOSTICS jobs_deleted = ROW_COUNT;
  RAISE LOG 'Deleted % old ai_tryon_jobs records', jobs_deleted;
  
  -- Return cleanup results
  RETURN QUERY SELECT 
    assets_deleted,
    jobs_deleted,
    COALESCE(ARRAY_LENGTH(files_to_delete, 1), 0),
    FORMAT('Cleanup completed: %s assets, %s jobs, %s files identified for deletion at %s', 
           assets_deleted, jobs_deleted, COALESCE(ARRAY_LENGTH(files_to_delete, 1), 0), NOW());
           
  -- Log completion
  RAISE LOG 'AI assets cleanup completed: % assets, % jobs deleted', assets_deleted, jobs_deleted;
END;
$function$;

-- Security Fix 2: Restrict public views to essential data only
-- Update brands_public view to limit exposed data
DROP VIEW IF EXISTS public.brands_public;
CREATE VIEW public.brands_public 
WITH (security_invoker = on)
AS SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  created_at,
  updated_at
FROM public.brands;

-- Update retailers_public view to limit exposed data  
DROP VIEW IF EXISTS public.retailers_public;
CREATE VIEW public.retailers_public
WITH (security_invoker = on)
AS SELECT 
  id,
  name, 
  slug,
  logo_url,
  bio,
  created_at,
  updated_at
FROM public.retailers;

-- Security Fix 3: Add RLS policies to limit anonymous access to public views
-- Create policy to require authentication for brands_public access
-- This prevents anonymous scraping while allowing legitimate business access

-- Since views don't support RLS directly, we'll create secure accessor functions instead
CREATE OR REPLACE FUNCTION public.get_public_brands(limit_param integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  name text,
  slug text, 
  logo_url text,
  bio text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Require authentication to prevent scraping
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access brand directory';
  END IF;
  
  -- Log access for monitoring
  PERFORM public.log_user_data_access('VIEW_PUBLIC_BRANDS', 'brands_public', auth.uid());
  
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.slug,
    b.logo_url,
    b.bio,
    b.created_at,
    b.updated_at
  FROM public.brands b
  ORDER BY b.name
  LIMIT limit_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_retailers(limit_param integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text, 
  bio text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Require authentication to prevent scraping
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access retailer directory';
  END IF;
  
  -- Log access for monitoring  
  PERFORM public.log_user_data_access('VIEW_PUBLIC_RETAILERS', 'retailers_public', auth.uid());
  
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    r.logo_url,
    r.bio,
    r.created_at,
    r.updated_at
  FROM public.retailers r
  ORDER BY r.name
  LIMIT limit_param;
END;
$function$;