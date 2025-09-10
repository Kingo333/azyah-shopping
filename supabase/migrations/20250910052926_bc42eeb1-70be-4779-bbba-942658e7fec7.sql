-- Fix RLS policies for product deletion by brand owners, retailer owners, and admins
-- Allow brand owners to delete products from their brand
CREATE POLICY "Brand owners can delete their products" 
ON public.products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id = products.brand_id 
    AND brands.owner_user_id = auth.uid()
  )
);

-- Allow retailer owners to delete products from their retailer
CREATE POLICY "Retailer owners can delete their products" 
ON public.products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.retailers 
    WHERE retailers.id = products.retailer_id 
    AND retailers.owner_user_id = auth.uid()
  )
);

-- Allow admins to delete any products
CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);