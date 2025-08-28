-- Fix security vulnerabilities by updating RLS policies on source tables
-- and modifying public views to be accessible only to authenticated users

-- Update RLS policies on brands table to be more restrictive for anonymous users
DROP POLICY IF EXISTS "Anonymous users cannot access brands table directly" ON public.brands;
CREATE POLICY "Anonymous users cannot access brands table directly" 
ON public.brands 
FOR SELECT 
USING (false);

-- Update RLS policies on retailers table to be more restrictive for anonymous users  
DROP POLICY IF EXISTS "Anonymous users cannot access retailers table directly" ON public.retailers;
CREATE POLICY "Anonymous users cannot access retailers table directly" 
ON public.retailers 
FOR SELECT 
USING (false);

-- Drop existing public views
DROP VIEW IF EXISTS public.brands_public;
DROP VIEW IF EXISTS public.retailers_public;

-- Recreate brands_public view with security definer to control access
CREATE OR REPLACE VIEW public.brands_public 
WITH (security_barrier = true)
AS SELECT 
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
FROM public.brands
WHERE auth.role() = 'authenticated';

-- Recreate retailers_public view with security definer to control access
CREATE OR REPLACE VIEW public.retailers_public 
WITH (security_barrier = true)
AS SELECT 
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
FROM public.retailers
WHERE auth.role() = 'authenticated';

-- Grant access to authenticated users only
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.retailers_public TO authenticated;

-- Revoke access from anonymous users
REVOKE ALL ON public.brands_public FROM anon;
REVOKE ALL ON public.retailers_public FROM anon;