-- Add product_id column to link event products to catalog products for asset reuse
ALTER TABLE event_brand_products 
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_event_brand_products_product_id 
ON event_brand_products(product_id);