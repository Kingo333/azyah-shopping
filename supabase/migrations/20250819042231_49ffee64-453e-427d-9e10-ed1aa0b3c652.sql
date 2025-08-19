-- Clean up orphaned retailers and their products
-- First delete products from orphaned retailers
DELETE FROM products 
WHERE retailer_id IN (
  SELECT id FROM retailers 
  WHERE owner_user_id IS NULL
);

-- Then delete the orphaned retailers
DELETE FROM retailers 
WHERE owner_user_id IS NULL;