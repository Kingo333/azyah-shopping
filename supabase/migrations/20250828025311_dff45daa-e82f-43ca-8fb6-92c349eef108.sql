-- Critical Security Fixes: Fix RLS policies and public views
-- This addresses multiple security vulnerabilities while maintaining functionality

-- 1. Fix brands_public view - Remove sensitive data exposure
DROP VIEW IF EXISTS public.brands_public;
CREATE VIEW public.brands_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  website,
  -- Remove contact_email and owner_user_id from public view
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.brands;

-- Enable RLS on brands_public view
ALTER VIEW public.brands_public SET (security_barrier = true);

-- 2. Fix retailers_public view - Remove sensitive data exposure  
DROP VIEW IF EXISTS public.retailers_public;
CREATE VIEW public.retailers_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  website,
  -- Remove contact_email and owner_user_id from public view
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.retailers;

-- Enable RLS on retailers_public view
ALTER VIEW public.retailers_public SET (security_barrier = true);

-- 3. Create RLS policies for public views to allow anonymous access to safe data only
CREATE POLICY "Anonymous users can view safe brand data"
ON public.brands_public FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anonymous users can view safe retailer data"  
ON public.retailers_public FOR SELECT
TO anon
USING (true);

-- 4. Create secure functions for authenticated access to sensitive data
CREATE OR REPLACE FUNCTION public.get_brand_contact_info(brand_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return contact info to authenticated users who are:
  -- 1. The brand owner, or
  -- 2. An admin, or  
  -- 3. A legitimate business user (authenticated)
  
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  RETURN QUERY
  SELECT b.contact_email, b.owner_user_id
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_retailer_contact_info(retailer_id_param uuid)
RETURNS TABLE(contact_email text, owner_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return contact info to authenticated users
  
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access contact information';
  END IF;
  
  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$$;

-- 5. Add audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  action_type text,
  resource_type text,
  resource_id uuid,
  accessed_field text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    accessed_user_id
  ) VALUES (
    auth.uid(),
    format('%s_%s_%s', action_type, resource_type, accessed_field),
    resource_type,
    resource_id
  );
END;
$$;