-- SECURITY INVOKER VIEWS - Fixed Implementation
-- This properly resolves the Security Definer View warnings

-- Drop existing views 
DROP VIEW IF EXISTS public.brands_public CASCADE;
DROP VIEW IF EXISTS public.retailers_public CASCADE;

-- Create views with SECURITY INVOKER to respect RLS policies
CREATE VIEW public.brands_public 
WITH (security_invoker=on) AS
SELECT 
    id,
    name,
    slug,
    logo_url,
    bio,
    website,
    cover_image_url,
    socials,
    shipping_regions,
    created_at,
    updated_at
FROM public.brands;

CREATE VIEW public.retailers_public 
WITH (security_invoker=on) AS
SELECT 
    id,
    name,
    slug,
    logo_url,
    bio,
    website,
    cover_image_url,
    socials,
    shipping_regions,
    created_at,
    updated_at
FROM public.retailers;

-- Grant permissions
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.retailers_public TO anon;
GRANT SELECT ON public.retailers_public TO authenticated;

-- Add documentation
COMMENT ON VIEW public.brands_public IS 'SECURITY INVOKER view - respects RLS policies of querying user';
COMMENT ON VIEW public.retailers_public IS 'SECURITY INVOKER view - respects RLS policies of querying user';