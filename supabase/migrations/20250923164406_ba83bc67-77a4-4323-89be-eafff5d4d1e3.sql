-- Phase 1: Remove all existing event-related tables
DROP TABLE IF EXISTS event_tryon_sessions CASCADE;
DROP TABLE IF EXISTS event_products CASCADE;
DROP TABLE IF EXISTS event_brands CASCADE;
DROP TABLE IF EXISTS events_retail CASCADE;

-- Phase 2: Create new simplified event system
CREATE TABLE retail_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE retail_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for retail_events
CREATE POLICY "Public can view active events" 
ON retail_events 
FOR SELECT 
USING (status = 'active' AND event_date >= CURRENT_DATE);

CREATE POLICY "Retailer owners can manage their events" 
ON retail_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM retailers r 
  WHERE r.id = retail_events.retailer_id 
  AND r.owner_user_id = auth.uid()
));

-- Event catalog - linking existing products to events
CREATE TABLE event_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES retail_events(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  featured BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, product_id)
);

-- Enable RLS
ALTER TABLE event_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_catalog
CREATE POLICY "Public can view catalog for active events" 
ON event_catalog 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM retail_events e 
  WHERE e.id = event_catalog.event_id 
  AND e.status = 'active' 
  AND e.event_date >= CURRENT_DATE
));

CREATE POLICY "Retailer owners can manage event catalog" 
ON event_catalog 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM retail_events e 
  JOIN retailers r ON r.id = e.retailer_id 
  WHERE e.id = event_catalog.event_id 
  AND r.owner_user_id = auth.uid()
));

-- User event participation (optional)
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES retail_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_participants
CREATE POLICY "Users can manage their own participation" 
ON event_participants 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view participation for active events" 
ON event_participants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM retail_events e 
  WHERE e.id = event_participants.event_id 
  AND e.status = 'active'
));