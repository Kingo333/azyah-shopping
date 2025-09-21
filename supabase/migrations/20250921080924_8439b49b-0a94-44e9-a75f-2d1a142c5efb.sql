-- Remove anonymous access to products table to prevent competitive intelligence gathering
DROP POLICY IF EXISTS "Anonymous users can view basic product info only" ON public.products;

-- Ensure only authenticated users can access products table directly
-- All anonymous access should go through secure RPC functions like get_minimal_product_catalog
CREATE POLICY "Block anonymous product access"
ON public.products
FOR SELECT
TO anon
USING (false);

-- Log security enhancement
INSERT INTO public.security_audit_log (
  user_id,
  action,
  table_name,
  ip_address
) VALUES (
  NULL,
  'SECURITY_ENHANCEMENT: Blocked anonymous product table access',
  'products',
  '127.0.0.1'
) ON CONFLICT DO NOTHING;