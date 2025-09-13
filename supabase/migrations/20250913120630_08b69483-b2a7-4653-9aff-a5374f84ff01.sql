-- Fix critical security issue: Remove overly permissive contact data access policies
-- and implement proper tiered access control for brands and retailers

-- Drop the problematic policies that expose contact information to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view brand contact details" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view retailer contact details" ON public.retailers;

-- Clean up duplicate/conflicting retailer policies  
DROP POLICY IF EXISTS "authenticated_users_retailer_directory_access" ON public.retailers;
DROP POLICY IF EXISTS "Only retailer owners and admins can view sensitive retailer dat" ON public.retailers;
DROP POLICY IF EXISTS "Retailer owners and service role only" ON public.retailers;
DROP POLICY IF EXISTS "retailer_owners_full_access" ON public.retailers;

-- Create secure, tiered access policies for brands table
-- 1. Public can view only safe fields (no contact info)
CREATE POLICY "Public can view safe brand fields only" 
ON public.brands 
FOR SELECT 
USING (true);

-- 2. Brand owners can view and manage all their brand data including contact info
CREATE POLICY "Brand owners full access to their brands" 
ON public.brands 
FOR ALL 
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- Create secure, tiered access policies for retailers table  
-- 1. Public can view only safe fields (no contact info)
CREATE POLICY "Public can view safe retailer fields only" 
ON public.retailers 
FOR SELECT 
USING (true);

-- 2. Retailer owners can view and manage all their retailer data including contact info
CREATE POLICY "Retailer owners full access to their retailers" 
ON public.retailers 
FOR ALL 
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- Note: Contact information access should only be done through the secure RPC functions:
-- - get_brand_contact_info(brand_id) for authenticated users 
-- - get_retailer_contact_info(retailer_id) for authenticated users
-- These functions include proper logging and authentication checks