-- Fix function search path security warnings
-- Update the functions to have explicit search paths

-- Update get_brand_safe_fields function
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

-- Update get_retailer_safe_fields function  
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