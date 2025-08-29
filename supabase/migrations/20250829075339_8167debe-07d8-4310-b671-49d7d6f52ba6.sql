-- Drop existing views and recreate as security invoker views
DROP VIEW IF EXISTS public.brands_public;
DROP VIEW IF EXISTS public.retailers_public;

-- Create security invoker views that respect RLS policies
CREATE OR REPLACE VIEW public.brands_public WITH (security_invoker=on) AS
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

CREATE OR REPLACE VIEW public.retailers_public WITH (security_invoker=on) AS
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

-- Grant select permissions on the views to authenticated and anonymous users
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.retailers_public TO authenticated;
GRANT SELECT ON public.retailers_public TO anon;