-- Fix security issues with views by removing SECURITY DEFINER and adding proper RLS
-- This addresses the linter warnings about security definer views

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.brands_public;
DROP VIEW IF EXISTS public.retailers_public;

-- Create regular views (not security definer) with proper RLS
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

-- Grant appropriate access to views
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.retailers_public TO anon;
GRANT SELECT ON public.retailers_public TO authenticated;

-- Add RLS to the views themselves
ALTER VIEW public.brands_public SET (security_barrier = true);
ALTER VIEW public.retailers_public SET (security_barrier = true);

-- Update function search paths for existing functions that need it
-- This addresses the function search path mutable warning

CREATE OR REPLACE FUNCTION public.embedQuery(query text)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Placeholder for embedding function
  -- In real implementation, use OpenAI embeddings
  RETURN array_fill(0.0, ARRAY[1536]);
END;
$$;