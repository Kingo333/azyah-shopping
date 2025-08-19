-- Allow retailers to view likes on their products for analytics
CREATE POLICY "Retailers can view likes on their products" 
ON public.likes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM products p 
    JOIN retailers r ON r.id = p.retailer_id 
    WHERE p.id = likes.product_id 
    AND r.owner_user_id = auth.uid()
  )
);

-- Allow brands to view likes on their products for analytics  
CREATE POLICY "Brands can view likes on their products" 
ON public.likes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM products p 
    JOIN brands b ON b.id = p.brand_id 
    WHERE p.id = likes.product_id 
    AND b.owner_user_id = auth.uid()
  )
);