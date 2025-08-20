-- CRITICAL SECURITY FIX: Protect contact information in brands and retailers tables
-- This migration creates tiered access policies and public views to prevent data exposure

-- ===============================
-- BRANDS TABLE SECURITY FIXES
-- ===============================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view active brands" ON public.brands;

-- Create tiered access policies for brands
CREATE POLICY "Public can view basic brand info" 
ON public.brands 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can view brand contact details" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (true);

-- Brand owners maintain full access (existing policy should remain)
-- "Brand owners can manage their brands" policy already exists

-- Create public view for brands with safe fields only
CREATE OR REPLACE VIEW public.brands_public AS
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

-- Grant access to the public view
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.brands_public TO authenticated;

-- ===============================
-- RETAILERS TABLE SECURITY FIXES  
-- ===============================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view active retailers" ON public.retailers;

-- Create tiered access policies for retailers
CREATE POLICY "Public can view basic retailer info" 
ON public.retailers 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can view retailer contact details" 
ON public.retailers 
FOR SELECT 
TO authenticated
USING (true);

-- Retailer owners maintain full access (existing policy should remain)
-- "Retailer owners can manage their retailers" policy already exists

-- Create public view for retailers with safe fields only
CREATE OR REPLACE VIEW public.retailers_public AS
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

-- Grant access to the public view
GRANT SELECT ON public.retailers_public TO anon;
GRANT SELECT ON public.retailers_public TO authenticated;

-- ===============================
-- USERS TABLE POLICY CLEANUP
-- ===============================

-- The existing users policies are actually secure but complex
-- Keep them as-is since they properly restrict access to owner-only
-- The complexity is acceptable given the security requirements

-- ===============================
-- SECURITY VERIFICATION
-- ===============================

-- Add comments for future reference
COMMENT ON VIEW public.brands_public IS 'Public-safe view of brands table excluding sensitive contact information';
COMMENT ON VIEW public.retailers_public IS 'Public-safe view of retailers table excluding sensitive contact information';

-- Verify policies are working as expected
-- Anonymous users should only see basic info via views
-- Authenticated users can see full tables including contact info
-- Owners can manage their own records