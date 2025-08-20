-- CRITICAL FIX: Convert views to SECURITY INVOKER mode
-- This resolves the Security Definer View warnings by making views respect RLS

-- Drop existing views that are using default SECURITY DEFINER mode
DROP VIEW IF EXISTS public.brands_public CASCADE;
DROP VIEW IF EXISTS public.retailers_public CASCADE;

-- Recreate views with SECURITY INVOKER mode enabled
-- This ensures views respect Row Level Security policies of the querying user
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

-- Grant appropriate permissions to the security invoker views
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.retailers_public TO anon;
GRANT SELECT ON public.retailers_public TO authenticated;

-- Add comments explaining the security model
COMMENT ON VIEW public.brands_public IS 'Public-safe view of brands with SECURITY INVOKER - respects RLS policies';
COMMENT ON VIEW public.retailers_public IS 'Public-safe view of retailers with SECURITY INVOKER - respects RLS policies';

-- Verify the security invoker setting
SELECT 
    viewname,
    CASE 
        WHEN viewoptions @> ARRAY['security_invoker=on'] THEN 'SECURITY INVOKER ✅'
        ELSE 'SECURITY DEFINER ⚠️'
    END as security_mode
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('brands_public', 'retailers_public');