-- Add brand_name and brand_name_normalized columns to brand_reviews
-- This allows reviewing brands not yet registered in ugc_brands table

ALTER TABLE brand_reviews
ADD COLUMN IF NOT EXISTS brand_name TEXT;

ALTER TABLE brand_reviews
ADD COLUMN IF NOT EXISTS brand_name_normalized TEXT;

-- Add comment for documentation
COMMENT ON COLUMN brand_reviews.brand_name IS 'Used when reviewing a brand not yet in ugc_brands table. If brand_id is set, brand_name is optional.';
COMMENT ON COLUMN brand_reviews.brand_name_normalized IS 'Normalized version of brand_name (lowercase, trimmed) for deduplication and grouping.';

-- Create index on normalized brand name for efficient lookups
CREATE INDEX IF NOT EXISTS idx_brand_reviews_brand_name_normalized 
ON brand_reviews(brand_name_normalized) 
WHERE brand_name_normalized IS NOT NULL;