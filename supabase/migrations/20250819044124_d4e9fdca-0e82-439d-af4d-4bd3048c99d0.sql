-- Clean up remaining demo brands and products
-- Delete products from Urban Chic and Pearl Couture brands
DELETE FROM products 
WHERE brand_id IN (
  SELECT id FROM brands 
  WHERE name IN ('Urban Chic', 'Pearl Couture')
);

-- Delete the remaining demo brand records
DELETE FROM brands 
WHERE name IN ('Urban Chic', 'Pearl Couture');

-- Clean up any orphaned data for deleted products
DELETE FROM likes WHERE product_id NOT IN (SELECT id FROM products);
DELETE FROM cart_items WHERE product_id NOT IN (SELECT id FROM products);
DELETE FROM closet_items WHERE product_id NOT IN (SELECT id FROM products);
DELETE FROM swipes WHERE product_id NOT IN (SELECT id FROM products);