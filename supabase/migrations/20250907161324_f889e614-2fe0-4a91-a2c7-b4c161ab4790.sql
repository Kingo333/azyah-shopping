-- Allow authenticated users to check if products have outfits (for UI rendering)
DROP POLICY IF EXISTS "Anyone can check if products have outfits" ON product_outfit_assets;
CREATE POLICY "Anyone can check if products have outfits" 
ON product_outfit_assets 
FOR SELECT 
USING (true);

-- Keep existing policies for brand owners to manage their outfits
-- (Brand owners can already manage via existing policy)