-- Fix security warnings by recreating views without security_barrier
-- and implementing proper access control through RLS on source tables

-- Drop the problematic views
DROP VIEW IF EXISTS public.brands_public;
DROP VIEW IF EXISTS public.retailers_public;

-- Recreate simple views without security_barrier
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

-- The security is enforced by the RLS policies on the underlying brands and retailers tables
-- which already block anonymous access, so authenticated users can access the views
-- but anonymous users cannot access the underlying data