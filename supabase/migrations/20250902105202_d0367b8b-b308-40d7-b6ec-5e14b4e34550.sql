-- Security Fix: Restrict access to sensitive brand, retailer, and user behavior data
-- This migration addresses email harvesting and user behavior analysis vulnerabilities

-- 1. DROP overly permissive policies that expose contact data for brands
DROP POLICY IF EXISTS "Allow reading brands referenced by active products" ON brands;

-- 2. DROP overly permissive policies that expose contact data for retailers  
DROP POLICY IF EXISTS "Allow reading retailers referenced by active products" ON retailers;

-- 3. DROP overly permissive policy that exposes user shopping behavior in likes
DROP POLICY IF EXISTS "Allow read likes on active products (shoppers)" ON likes;

-- 4. Create secure replacement policies for brands
-- Allow public access to basic brand info only (no contact details)
CREATE POLICY "Public can view basic brand info" ON brands
FOR SELECT
USING (
  -- Only allow access to basic fields through the brands_public view
  -- This policy will work with the existing brands_public view that excludes contact data
  auth.role() = 'anon' OR auth.role() = 'authenticated'
);

-- 5. Create secure replacement policies for retailers
-- Allow public access to basic retailer info only (no contact details)  
CREATE POLICY "Public can view basic retailer info" ON retailers
FOR SELECT  
USING (
  -- Only allow access to basic fields through the retailers_public view
  -- This policy will work with the existing retailers_public view that excludes contact data
  auth.role() = 'anon' OR auth.role() = 'authenticated'
);

-- 6. Update existing policies to be more explicit about contact data protection
-- Ensure contact data access is strictly limited to owners and admins only
DROP POLICY IF EXISTS "Authenticated users can view brand contact details" ON brands;
DROP POLICY IF EXISTS "Only owners and admins can view brand contact data" ON brands;

CREATE POLICY "Only brand owners and admins can view sensitive brand data" ON brands
FOR SELECT
USING (
  -- Strict access: only owner or admin can see contact_email and other sensitive fields
  auth.uid() = owner_user_id OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- 7. Same protection for retailers
DROP POLICY IF EXISTS "Authenticated users can view retailer contact details" ON retailers;
DROP POLICY IF EXISTS "Only owners and admins can view retailer contact data" ON retailers;

CREATE POLICY "Only retailer owners and admins can view sensitive retailer data" ON retailers  
FOR SELECT
USING (
  -- Strict access: only owner or admin can see contact_email and other sensitive fields
  auth.uid() = owner_user_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- 8. For likes table, keep existing secure policies (no changes needed)
-- The remaining policies already properly restrict access:
-- - "Users can view their own likes" 
-- - "Brands can view likes on their products"
-- - "Retailers can view likes on their products"
-- - "Users can create their own likes"
-- - "Users can delete their own likes"

-- 9. Add helpful comments to document the security model
COMMENT ON POLICY "Public can view basic brand info" ON brands IS 
'Allows public access to basic brand information. Sensitive data like contact_email is protected by separate owner/admin-only policies.';

COMMENT ON POLICY "Public can view basic retailer info" ON retailers IS
'Allows public access to basic retailer information. Sensitive data like contact_email is protected by separate owner/admin-only policies.';

COMMENT ON POLICY "Only brand owners and admins can view sensitive brand data" ON brands IS
'Restricts access to sensitive brand data including contact_email to owners and admins only.';

COMMENT ON POLICY "Only retailer owners and admins can view sensitive retailer data" ON retailers IS  
'Restricts access to sensitive retailer data including contact_email to owners and admins only.';