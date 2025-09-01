-- Security Fix: Add explicit search path to database functions to prevent injection
-- This hardens functions against search path manipulation attacks

-- Update brand contact info function
CREATE OR REPLACE FUNCTION public.get_brand_contact_info(brand_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Log access attempt
  PERFORM public.log_user_data_access('GET_BRAND_CONTACT', 'brands', brand_id_param);
  
  RETURN QUERY
  SELECT b.contact_email, b.owner_user_id
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$function$;

-- Update retailer contact info function
CREATE OR REPLACE FUNCTION public.get_retailer_contact_info(retailer_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return contact info to authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  -- Log access attempt
  PERFORM public.log_user_data_access('GET_RETAILER_CONTACT', 'retailers', retailer_id_param);
  
  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$function$;

-- Update public brands function
CREATE OR REPLACE FUNCTION public.get_public_brands(limit_param integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, bio text, created_at timestamp with time zone, updated_at timestamp with time zone)
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

-- Update public retailers function
CREATE OR REPLACE FUNCTION public.get_public_retailers(limit_param integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, bio text, created_at timestamp with time zone, updated_at timestamp with time zone)
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

-- Enhanced security audit logging with rate limiting info
CREATE OR REPLACE FUNCTION public.log_user_data_access_enhanced(action_type text, table_name text, accessed_user_id uuid, additional_context jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id,
    ip_address
  ) VALUES (
    auth.uid(),
    action_type || CASE 
      WHEN additional_context IS NOT NULL THEN ' - ' || additional_context::text
      ELSE ''
    END,
    table_name,
    accessed_user_id,
    inet_client_addr()
  );
END;
$function$;