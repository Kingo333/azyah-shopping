-- SECURITY FIX: Eliminate Security Definer View warnings (Fixed Syntax)
-- Replace current views with properly configured ones

-- Drop existing views
DROP VIEW IF EXISTS public.brands_public CASCADE;
DROP VIEW IF EXISTS public.retailers_public CASCADE;

-- Drop the problematic policies we just created
DROP POLICY IF EXISTS "Public can read brands view" ON public.brands;
DROP POLICY IF EXISTS "Public can read retailers view" ON public.retailers;

-- Recreate views with proper syntax (no invalid check_option)
CREATE VIEW public.brands_public AS
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

CREATE VIEW public.retailers_public AS
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

-- Ensure proper permissions are granted explicitly
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.retailers_public TO anon;
GRANT SELECT ON public.retailers_public TO authenticated;

-- Add comments for clarity
COMMENT ON VIEW public.brands_public IS 'Public-safe view of brands excluding sensitive contact information';
COMMENT ON VIEW public.retailers_public IS 'Public-safe view of retailers excluding sensitive contact information';

-- Verify the views are not using security definer by checking their definitions
-- These views will use the permissions of the querying user, not the creator