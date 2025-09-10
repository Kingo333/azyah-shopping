-- Fix the product deletion issue by updating the delete operation to use UPDATE instead of actual DELETE
-- The RLS policies are working correctly, but we need to allow soft deletes (status updates)

-- Add a new policy specifically for soft deletes (status updates) for retailer owners
CREATE POLICY "Retailer owners can soft delete their products" 
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
  AND status IN ('active', 'archived', 'draft')
);