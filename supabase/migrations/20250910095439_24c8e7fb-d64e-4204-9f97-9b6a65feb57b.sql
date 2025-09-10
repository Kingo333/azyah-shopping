-- Clean solution: Revert retailer creation and fix data model
-- Remove the artificially created retailer account for brand@test.com user

-- 1. Remove retailer_id from products owned by brands (they don't need retailers)
UPDATE public.products 
SET retailer_id = NULL,
    updated_at = now()
WHERE brand_id = '0c8329d1-89cd-4128-bae8-33512a189bb4';

-- 2. Delete the artificial retailer account for brand@test.com
DELETE FROM public.retailers 
WHERE owner_user_id = 'bfe3cd03-8f4d-417a-8730-032f1cb3fdc3'
  AND name = 'Alex Fashion Retailer';

-- 3. Update RLS policies to allow brand owners to manage their products without retailer assignment
DROP POLICY IF EXISTS "Brand owners can manage their products" ON public.products;
DROP POLICY IF EXISTS "Retailer owners can manage their products" ON public.products;

-- Create new policy for brand owners to manage their products
CREATE POLICY "Brand owners can manage their products" ON public.products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.brands b 
    WHERE b.id = products.brand_id 
    AND b.owner_user_id = auth.uid()
  )
);

-- Create policy for retailer owners to manage products assigned to their retailers
CREATE POLICY "Retailer owners can manage assigned products" ON public.products
FOR ALL USING (
  retailer_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.retailers r 
    WHERE r.id = products.retailer_id 
    AND r.owner_user_id = auth.uid()
  )
);

-- Public can view active products (for browsing)
CREATE POLICY "Public can view active products" ON public.products
FOR SELECT USING (status = 'active');