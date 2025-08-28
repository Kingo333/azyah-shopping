-- Critical Security Fixes: Remove sensitive data from public views
-- This addresses data exposure vulnerabilities while maintaining functionality

-- 1. Update brands_public view to exclude sensitive data
DROP VIEW IF EXISTS public.brands_public;
CREATE VIEW public.brands_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  website,
  -- Exclude contact_email and owner_user_id from public view
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.brands;

-- 2. Update retailers_public view to exclude sensitive data  
DROP VIEW IF EXISTS public.retailers_public;
CREATE VIEW public.retailers_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  website,
  -- Exclude contact_email and owner_user_id from public view
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.retailers;

-- 3. Create secure functions for authenticated access to sensitive data
CREATE OR REPLACE FUNCTION public.get_brand_contact_info(brand_id_param uuid)
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
  
  -- Log access attempt
  PERFORM public.log_user_data_access('GET_BRAND_CONTACT', 'brands', brand_id_param);
  
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
  
  -- Log access attempt
  PERFORM public.log_user_data_access('GET_RETAILER_CONTACT', 'retailers', retailer_id_param);
  
  RETURN QUERY
  SELECT r.contact_email, r.owner_user_id
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$$;