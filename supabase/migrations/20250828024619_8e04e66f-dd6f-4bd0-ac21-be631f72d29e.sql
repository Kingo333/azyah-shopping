-- Drop and recreate public views without SECURITY DEFINER
-- These views provide safe access to brand and retailer data without sensitive fields

DROP VIEW IF EXISTS public.brands_public;
DROP VIEW IF EXISTS public.retailers_public;

-- Create brands_public view without SECURITY DEFINER
CREATE VIEW public.brands_public AS
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

-- Create retailers_public view without SECURITY DEFINER  
CREATE VIEW public.retailers_public AS
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

-- Grant SELECT permissions to allow public access
GRANT SELECT ON public.brands_public TO anon, authenticated;
GRANT SELECT ON public.retailers_public TO anon, authenticated;