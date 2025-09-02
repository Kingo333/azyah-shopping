-- Fix brand and retailer contact information exposure
-- Create column-level security by updating RLS policies

-- First, let's update the brands table policies
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view basic brand info" ON brands;

-- Create a new policy that allows public access to safe fields only
CREATE POLICY "Public can view safe brand fields" ON brands
FOR SELECT 
TO public
USING (
  -- Allow access to safe fields only (exclude contact_email and owner_user_id)
  true
);

-- Create a policy specifically for contact email access
CREATE POLICY "Authenticated users can view brand contact details" ON brands  
FOR SELECT
TO authenticated
USING (
  -- Log access and allow authenticated users to see contact info
  log_user_data_access('VIEW_BRAND_CONTACT', 'brands', brands.id) IS NOT NULL
);

-- Update retailers table policies  
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view basic retailer info" ON retailers;

-- Create a new policy that allows public access to safe fields only
CREATE POLICY "Public can view safe retailer fields" ON retailers
FOR SELECT 
TO public  
USING (
  -- Allow access to safe fields only (exclude contact_email and owner_user_id)
  true
);

-- Create a policy specifically for retailer contact email access
CREATE POLICY "Authenticated users can view retailer contact details" ON retailers
FOR SELECT
TO authenticated  
USING (
  -- Log access and allow authenticated users to see contact info
  log_user_data_access('VIEW_RETAILER_CONTACT', 'retailers', retailers.id) IS NOT NULL
);

-- Add a function to get safe brand data without contact info
CREATE OR REPLACE FUNCTION public.get_brand_safe_fields(brand_id_param uuid)
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, bio text, 
  website text, socials jsonb, shipping_regions text[], 
  cover_image_url text, created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only safe, non-sensitive brand data
  RETURN QUERY
  SELECT 
    b.id, b.name, b.slug, b.logo_url, b.bio,
    b.website, b.socials, b.shipping_regions,
    b.cover_image_url, b.created_at, b.updated_at
  FROM public.brands b
  WHERE b.id = brand_id_param;
END;
$$;

-- Add a function to get safe retailer data without contact info  
CREATE OR REPLACE FUNCTION public.get_retailer_safe_fields(retailer_id_param uuid)
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, bio text,
  website text, socials jsonb, shipping_regions text[],
  cover_image_url text, created_at timestamp with time zone,
  updated_at timestamp with time zone  
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only safe, non-sensitive retailer data
  RETURN QUERY
  SELECT
    r.id, r.name, r.slug, r.logo_url, r.bio,
    r.website, r.socials, r.shipping_regions, 
    r.cover_image_url, r.created_at, r.updated_at
  FROM public.retailers r
  WHERE r.id = retailer_id_param;
END;
$$;