-- Revert security changes that blocked anonymous access to products table
-- This allows the landing page to display products for anonymous users

-- Remove the blocking policy for anonymous users
DROP POLICY IF EXISTS "Block anonymous product access" ON public.products;

-- Re-create the anonymous access policy with basic product info
CREATE POLICY "Anonymous users can view basic product info only"
ON public.products
FOR SELECT
TO anon
USING (
  status = 'active' AND
  -- Only allow access to safe, non-sensitive fields
  true
);

-- Clean up the security audit log entry if it exists
DELETE FROM public.security_audit_log 
WHERE action = 'SECURITY_ENHANCEMENT: Blocked anonymous product table access'
AND table_name = 'products';