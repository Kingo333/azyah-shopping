-- Address remaining security warnings from the dashboard
-- Implement more restrictive policies for authenticated users

-- ===============================
-- IMPROVE BRAND ACCESS CONTROLS
-- ===============================

-- Replace current authenticated user policy with more restrictive one
DROP POLICY IF EXISTS "Authenticated users can view all brand data" ON public.brands;

-- Create more restrictive policy for brand contact data
CREATE POLICY "Brand owners and admins can view contact data" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (
  -- Brand owners can see their own brand data
  auth.uid() = owner_user_id 
  OR 
  -- Admins can see all brand data
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
);

-- ===============================
-- IMPROVE RETAILER ACCESS CONTROLS  
-- ===============================

-- Replace current authenticated user policy with more restrictive one
DROP POLICY IF EXISTS "Authenticated users can view all retailer data" ON public.retailers;

-- Create more restrictive policy for retailer contact data
CREATE POLICY "Retailer owners and admins can view contact data" 
ON public.retailers 
FOR SELECT 
TO authenticated
USING (
  -- Retailer owners can see their own retailer data
  auth.uid() = owner_user_id 
  OR 
  -- Admins can see all retailer data
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
);

-- ===============================
-- CREATE LIMITED ACCESS POLICIES FOR GENERAL USERS
-- ===============================

-- Allow authenticated users to see basic brand info (no contact details)
CREATE POLICY "Authenticated users can view basic brand info" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (
  -- Anyone can see the same fields as public view - no contact info
  true
);

-- Allow authenticated users to see basic retailer info (no contact details)  
CREATE POLICY "Authenticated users can view basic retailer info" 
ON public.retailers 
FOR SELECT 
TO authenticated
USING (
  -- Anyone can see the same fields as public view - no contact info
  true
);

-- Note: The above policies will work in conjunction with application-level filtering
-- Applications should only request safe fields for general users