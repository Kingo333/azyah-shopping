-- Delete products that are not from US or UK markets
-- Check external_url for market indicators like .com (US) and .co.uk (UK)
DELETE FROM products 
WHERE retailer_id IN (
  SELECT id FROM retailers WHERE owner_user_id = auth.uid()
)
AND (
  external_url NOT LIKE '%amazon.com%' 
  AND external_url NOT LIKE '%amazon.co.uk%'
  AND external_url NOT LIKE '%.com%'
  AND external_url NOT LIKE '%.co.uk%'
  OR external_url IS NULL
);