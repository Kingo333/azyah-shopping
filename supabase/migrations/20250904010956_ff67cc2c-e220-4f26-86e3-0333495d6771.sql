-- Fix anonymous product access by dropping restrictive policies and creating proper anonymous access
-- This allows anonymous users to view basic product information on the landing page

-- Drop the overly restrictive policies that are blocking anonymous access
DROP POLICY IF EXISTS "block_anonymous_access" ON public.products;
DROP POLICY IF EXISTS "Block anonymous product access" ON public.products;

-- Create a comprehensive policy for anonymous product viewing
-- Allow anonymous users to read basic product information with brand details
CREATE POLICY "anonymous_can_view_products" 
ON public.products 
FOR SELECT 
USING (
  status = 'active' AND
  (
    -- Allow all users (authenticated and anonymous) to see active products
    auth.role() = 'anon' OR 
    auth.role() = 'authenticated' OR
    auth.uid() IS NOT NULL
  )
);

-- Keep existing policies for authenticated users and brand/retailer management
-- These remain unchanged for proper access control for sensitive operations

-- Also ensure brands table allows anonymous access to basic brand info
-- Drop overly restrictive brand policies
DROP POLICY IF EXISTS "brands_anonymous_block" ON public.brands;

-- Create anonymous brand viewing policy
CREATE POLICY "anonymous_can_view_basic_brand_info" 
ON public.brands 
FOR SELECT 
USING (
  -- Allow anonymous users to see basic brand information
  -- This is needed for product listings to show brand names
  auth.role() = 'anon' OR 
  auth.role() = 'authenticated' OR
  auth.uid() IS NOT NULL
);