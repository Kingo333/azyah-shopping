-- First, let's see what products you actually have
SELECT p.id, p.external_url, p.title, r.name as retailer_name
FROM products p
LEFT JOIN retailers r ON p.retailer_id = r.id  
WHERE r.owner_user_id = (SELECT id FROM users WHERE email = 'retailer@test.com')
LIMIT 5;

-- Now let's count them properly
SELECT COUNT(*) as my_products
FROM products p
JOIN retailers r ON p.retailer_id = r.id  
WHERE r.owner_user_id = (SELECT id FROM users WHERE email = 'retailer@test.com');