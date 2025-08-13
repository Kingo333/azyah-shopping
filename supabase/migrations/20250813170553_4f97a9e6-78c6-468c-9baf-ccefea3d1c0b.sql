-- Drop existing restrictive policies on events table
DROP POLICY IF EXISTS "Users can view their own events" ON events;

-- Create new policies that allow brands and retailers to see events for their products
CREATE POLICY "Brands can view events for their products" 
ON events FOR SELECT 
USING (
  brand_id IN (
    SELECT id FROM brands WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Retailers can view events for their products" 
ON events FOR SELECT 
USING (
  retailer_id IN (
    SELECT id FROM retailers WHERE owner_user_id = auth.uid()
  )
);

-- Allow admins to view all events
CREATE POLICY "Admins can view all events" 
ON events FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Keep the existing insert policy (anyone can create events)
-- This should already exist: "Anyone can create events"