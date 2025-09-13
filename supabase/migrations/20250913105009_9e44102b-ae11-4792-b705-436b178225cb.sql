-- CRITICAL SECURITY FIX: Protect brand and retailer contact information
-- Phase 1: Implement restrictive access policies and secure public views

-- First, let's secure the brands table with proper RLS policies
-- Drop any existing overly permissive policies and create secure ones

-- Secure brands table access
DROP POLICY IF EXISTS "Public can view brands" ON public.brands;
DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;

-- Create secure brand access policies
CREATE POLICY "Authenticated users can view brand contact details" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Secure retailers table access  
DROP POLICY IF EXISTS "Public can view retailers" ON public.retailers;
DROP POLICY IF EXISTS "Anyone can view retailers" ON public.retailers;

CREATE POLICY "Authenticated users can view retailer contact details"
ON public.retailers
FOR SELECT
TO authenticated  
USING (auth.uid() IS NOT NULL);

-- Create secure public views with safe fields only (no contact_email, no owner_user_id)
CREATE OR REPLACE VIEW public.brands_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  bio,
  website,
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.brands;

CREATE OR REPLACE VIEW public.retailers_public AS
SELECT
  id,
  name,
  slug, 
  logo_url,
  bio,
  website,
  socials,
  shipping_regions,
  cover_image_url,
  created_at,
  updated_at
FROM public.retailers;

-- Create secure functions for accessing contact information with audit logging
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

-- Create audit logging function for security monitoring
CREATE OR REPLACE FUNCTION public.log_user_data_access(action_type text, table_name text, accessed_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create audit log table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    accessed_user_id uuid,
    ip_address inet DEFAULT inet_client_addr(),
    created_at timestamp with time zone DEFAULT now()
  );
  
  -- Log the access attempt
  INSERT INTO public.security_audit_log (user_id, action, table_name, accessed_user_id)
  VALUES (auth.uid(), action_type, table_name, accessed_user_id);
END;
$$;

-- Create secure functions for public data access with monitoring
CREATE OR REPLACE FUNCTION public.get_public_brands()
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, bio text,
  website text, socials jsonb, shipping_regions text[],
  cover_image_url text, created_at timestamp with time zone, updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log public access for monitoring
  PERFORM public.log_user_data_access('PUBLIC_BRAND_ACCESS', 'brands_public', null);
  
  RETURN QUERY
  SELECT * FROM public.brands_public;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_retailers()  
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, bio text,
  website text, socials jsonb, shipping_regions text[],
  cover_image_url text, created_at timestamp with time zone, updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log public access for monitoring
  PERFORM public.log_user_data_access('PUBLIC_RETAILER_ACCESS', 'retailers_public', null);
  
  RETURN QUERY
  SELECT * FROM public.retailers_public;
END;
$$;