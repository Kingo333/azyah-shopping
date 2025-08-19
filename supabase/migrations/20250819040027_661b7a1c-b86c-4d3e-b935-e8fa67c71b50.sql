-- Delete products that are NOT from US (.com) or UK (.co.uk) markets
DELETE FROM products 
WHERE retailer_id IN (
  SELECT r.id FROM retailers r WHERE r.owner_user_id = (SELECT id FROM users WHERE email = 'retailer@test.com')
)
AND NOT (
  external_url LIKE '%amazon.com%' OR 
  external_url LIKE '%amazon.co.uk%' OR
  external_url LIKE '%asos.com/us%' OR
  external_url LIKE '%asos.com/co.uk%' OR
  external_url LIKE '%.com/%' OR
  external_url LIKE '%.co.uk/%'
);