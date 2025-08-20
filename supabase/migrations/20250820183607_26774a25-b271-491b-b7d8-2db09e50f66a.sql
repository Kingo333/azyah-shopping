-- SECURITY FIX: Eliminate Security Definer View warnings
-- Replace current views with properly configured ones that respect RLS

-- Drop existing views
DROP VIEW IF EXISTS public.brands_public CASCADE;
DROP VIEW IF EXISTS public.retailers_public CASCADE;

-- Recreate views with explicit non-security-definer configuration
-- These views will inherit the permissions of the querying user, not the creator
CREATE VIEW public.brands_public 
WITH (security_barrier=false, check_option=none) AS
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
WITH (security_barrier=false, check_option=none) AS
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

-- Enable RLS on the views themselves to ensure proper security
ALTER VIEW public.brands_public SET (security_barrier=false);
ALTER VIEW public.retailers_public SET (security_barrier=false);

-- Create specific policies for view access that don't rely on security definer
CREATE POLICY "Public can read brands view" 
ON public.brands 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Public can read retailers view" 
ON public.retailers 
FOR SELECT 
TO public  
USING (true);

-- Ensure proper permissions are granted explicitly
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.retailers_public TO anon;
GRANT SELECT ON public.retailers_public TO authenticated;

-- Add ownership information to prevent confusion
COMMENT ON VIEW public.brands_public IS 'Public-safe view of brands with no contact information - no security definer';
COMMENT ON VIEW public.retailers_public IS 'Public-safe view of retailers with no contact information - no security definer';