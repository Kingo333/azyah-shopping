-- CRITICAL FIX: Replace permissive policies with restrictive field-level access
-- This completely blocks anonymous access to sensitive fields in brands/retailers

-- ===============================
-- BRANDS TABLE - COMPLETE POLICY OVERHAUL
-- ===============================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can view basic brand info" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view brand contact details" ON public.brands;

-- Create restrictive policy that blocks anonymous access to contact_email and owner_user_id
-- This policy will force anonymous users to use the public view instead
CREATE POLICY "Anonymous users cannot access brands table directly" 
ON public.brands 
FOR SELECT 
TO anon
USING (false);  -- Completely block direct table access for anonymous users

-- Authenticated users can see full brand data
CREATE POLICY "Authenticated users can view all brand data" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (true);

-- ===============================
-- RETAILERS TABLE - COMPLETE POLICY OVERHAUL  
-- ===============================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can view basic retailer info" ON public.retailers;
DROP POLICY IF EXISTS "Authenticated users can view retailer contact details" ON public.retailers;

-- Create restrictive policy that blocks anonymous access to contact_email and owner_user_id
-- This policy will force anonymous users to use the public view instead
CREATE POLICY "Anonymous users cannot access retailers table directly" 
ON public.retailers 
FOR SELECT 
TO anon
USING (false);  -- Completely block direct table access for anonymous users

-- Authenticated users can see full retailer data
CREATE POLICY "Authenticated users can view all retailer data" 
ON public.retailers 
FOR SELECT 
TO authenticated
USING (true);

-- ===============================
-- ENSURE PUBLIC VIEWS ARE ACCESSIBLE
-- ===============================

-- Make sure public views are accessible to anonymous users
GRANT SELECT ON public.brands_public TO anon;
GRANT SELECT ON public.retailers_public TO anon;

-- ===============================
-- SECURITY VERIFICATION
-- ===============================

-- Test the policies work as expected:
-- 1. Anonymous users: Cannot SELECT from brands/retailers tables (blocked)
-- 2. Anonymous users: CAN SELECT from brands_public/retailers_public views (safe fields only)
-- 3. Authenticated users: Can SELECT from brands/retailers tables (full access)
-- 4. Owners: Can manage their own records (existing policies preserved)