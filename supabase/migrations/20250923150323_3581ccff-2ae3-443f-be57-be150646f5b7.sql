-- Modify event_brands table to store brand data directly instead of referencing main brands table
ALTER TABLE event_brands 
DROP CONSTRAINT IF EXISTS event_brands_brand_id_fkey;

-- Add columns to store brand information directly in event_brands
ALTER TABLE event_brands 
ADD COLUMN brand_name text,
ADD COLUMN brand_logo_url text,
ADD COLUMN brand_description text,
ADD COLUMN brand_website text;

-- Make brand_id nullable since we'll store brand data directly
ALTER TABLE event_brands 
ALTER COLUMN brand_id DROP NOT NULL;

-- Add constraint to ensure either brand_id exists (for existing brands) or brand_name exists (for custom brands)
ALTER TABLE event_brands 
ADD CONSTRAINT event_brands_brand_data_check 
CHECK (brand_id IS NOT NULL OR brand_name IS NOT NULL);

-- Update RLS policies to work with the new structure
DROP POLICY IF EXISTS "Public can view event brands for active events" ON event_brands;
DROP POLICY IF EXISTS "Retailer owners can manage event brands" ON event_brands;

CREATE POLICY "Public can view event brands for active events" 
ON event_brands 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM events_retail e 
  WHERE e.id = event_brands.event_id 
  AND e.status = 'active' 
  AND e.event_date >= CURRENT_DATE
));

CREATE POLICY "Retailer owners can manage event brands" 
ON event_brands 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM events_retail e 
  JOIN retailers r ON r.id = e.retailer_id 
  WHERE e.id = event_brands.event_id 
  AND r.owner_user_id = auth.uid()
));