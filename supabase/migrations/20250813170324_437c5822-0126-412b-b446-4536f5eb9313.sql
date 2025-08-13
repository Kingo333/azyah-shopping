-- Backfill brand_id and retailer_id for existing events where they are missing
UPDATE events 
SET 
  brand_id = products.brand_id,
  retailer_id = products.retailer_id
FROM products 
WHERE events.product_id = products.id 
  AND (events.brand_id IS NULL OR events.retailer_id IS NULL);