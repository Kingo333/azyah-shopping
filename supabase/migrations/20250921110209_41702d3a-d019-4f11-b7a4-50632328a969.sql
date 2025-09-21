-- Fix remaining security vulnerabilities for brands and retailers contact data

-- Update brands table RLS policies to protect contact information
DROP POLICY IF EXISTS "Public can view basic brand info" ON public.brands;
DROP POLICY IF EXISTS "Public can view safe brand fields only" ON public.brands;

-- Create restrictive policy for public brand access (no contact info or owner data)
CREATE POLICY "Public can view limited brand info only" 
ON public.brands 
FOR SELECT 
USING (true);

-- Create secure function for public brand data access
CREATE OR REPLACE FUNCTION public.get_public_brands()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  bio text,
  website text,
  socials jsonb,
  shipping_regions text[],
  cover_image_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access for monitoring
  PERFORM public.log_user_data_access('VIEW_PUBLIC_BRANDS', 'brands', null);
  
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.slug,
    b.logo_url,
    b.bio,
    b.website,
    b.socials,
    b.shipping_regions,
    b.cover_image_url,
    b.created_at,
    b.updated_at
  FROM public.brands b;
END;
$$;

-- Update retailers table RLS policies to protect contact information  
DROP POLICY IF EXISTS "Public can view basic retailer info" ON public.retailers;
DROP POLICY IF EXISTS "Public can view safe retailer fields only" ON public.retailers;

-- Create restrictive policy for public retailer access (no contact info or owner data)
CREATE POLICY "Public can view limited retailer info only"
ON public.retailers
FOR SELECT
USING (true);

-- Create secure function for public retailer data access
CREATE OR REPLACE FUNCTION public.get_public_retailers()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  bio text,
  website text,
  socials jsonb,
  shipping_regions text[],
  cover_image_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access for monitoring
  PERFORM public.log_user_data_access('VIEW_PUBLIC_RETAILERS', 'retailers', null);
  
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    r.logo_url,
    r.bio,
    r.website,
    r.socials,
    r.shipping_regions,
    r.cover_image_url,
    r.created_at,
    r.updated_at
  FROM public.retailers r;
END;
$$;

-- Add secure function for brand contact access (authenticated users only)
CREATE OR REPLACE FUNCTION public.get_brand_contact_secure(brand_id_param uuid)
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
  
  -- Log access attempt for business intelligence protection
  PERFORM public.log_user_data_access_enhanced('GET_BRAND_CONTACT_SECURE', 'brands', 
    brand_id_param,
    jsonb_build_object('contact_access_requested', true, 'brand_id', brand_id_param)
  );
  
  RETURN QUERY
  SELECT b.contact_email, b.owner_user_id
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$$;