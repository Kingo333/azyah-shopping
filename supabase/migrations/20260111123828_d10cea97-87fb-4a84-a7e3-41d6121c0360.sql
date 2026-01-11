-- Add case-insensitive unique indexes on brand and retailer names
-- This ensures no two brands or retailers can have the same display name (case-insensitive)
-- Note: This is safe as we verified no existing duplicates

-- Create unique index on brand names (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_lower_unique 
ON brands (LOWER(TRIM(name)));

-- Create unique index on retailer names (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS retailers_name_lower_unique 
ON retailers (LOWER(TRIM(name)));