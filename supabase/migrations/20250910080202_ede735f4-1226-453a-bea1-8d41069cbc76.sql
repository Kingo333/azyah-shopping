-- Fix conflicting RLS policies for product updates
-- Remove the duplicate soft delete policy that's causing conflicts
DROP POLICY IF EXISTS "Retailer owners can soft delete their products" ON public.products;

-- Ensure the main retailer update policy handles all update scenarios including soft deletes
DROP POLICY IF EXISTS "Retailer owners can update their products" ON public.products;

-- Create a single, comprehensive policy for retailer product updates
CREATE POLICY "Retailer owners can update their products" 
ON public.products 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM retailers r 
    WHERE r.id = products.retailer_id 
    AND r.owner_user_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM retailers r 
    WHERE r.id = products.retailer_id 
    AND r.owner_user_id = auth.uid()
  )
);