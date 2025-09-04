-- Drop all conflicting SELECT policies on products table
DROP POLICY IF EXISTS "Public can view basic product info" ON products;
DROP POLICY IF EXISTS "Authenticated users can view full product details" ON products;  
DROP POLICY IF EXISTS "Authenticated users can view full product info" ON products;
DROP POLICY IF EXISTS "anonymous_can_view_products" ON products;

-- Create two clear, non-conflicting SELECT policies
CREATE POLICY "Anonymous users can view active products" ON products
FOR SELECT USING (status = 'active');

CREATE POLICY "Authenticated users can view active products" ON products  
FOR SELECT USING (status = 'active' AND auth.uid() IS NOT NULL);