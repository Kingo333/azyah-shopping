-- Create enhanced closet system with mood boards/looks functionality

-- Enhanced closet_items table to support external products and better metadata
ALTER TABLE closet_items 
ADD COLUMN IF NOT EXISTS external_product_id TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT, 
ADD COLUMN IF NOT EXISTS price_cents INTEGER,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_bg_removed_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS attrs JSONB DEFAULT '{}';

-- Looks/Mood Boards table
CREATE TABLE IF NOT EXISTS looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  occasion TEXT,
  mood TEXT,
  canvas JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items placed on a look/mood board
CREATE TABLE IF NOT EXISTS look_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  look_id UUID NOT NULL REFERENCES looks(id) ON DELETE CASCADE,
  closet_item_id UUID REFERENCES closet_items(id),
  product_snapshot JSONB DEFAULT '{}',
  slot JSONB NOT NULL DEFAULT '{}',
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Votes for looks in explore
CREATE TABLE IF NOT EXISTS look_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  look_id UUID NOT NULL REFERENCES looks(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  value SMALLINT NOT NULL CHECK (value = 1),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(look_id, voter_id)
);

-- Look templates that users can save and reuse
CREATE TABLE IF NOT EXISTS look_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for looks
CREATE POLICY "Users can view their own looks" ON looks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public looks" ON looks
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage their own looks" ON looks
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for look_items
CREATE POLICY "Users can view items for their looks" ON look_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM looks 
      WHERE looks.id = look_items.look_id 
      AND (looks.user_id = auth.uid() OR looks.is_public = true)
    )
  );

CREATE POLICY "Users can manage items for their looks" ON look_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM looks 
      WHERE looks.id = look_items.look_id 
      AND looks.user_id = auth.uid()
    )
  );

-- RLS Policies for look_votes
CREATE POLICY "Anyone can view votes" ON look_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on public looks" ON look_votes
  FOR INSERT WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM looks 
      WHERE looks.id = look_votes.look_id 
      AND looks.is_public = true
      AND looks.user_id != auth.uid()
    )
  );

CREATE POLICY "Users can update their own votes" ON look_votes
  FOR UPDATE USING (auth.uid() = voter_id);

-- RLS Policies for look_templates
CREATE POLICY "Users can view their own templates" ON look_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public templates" ON look_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage their own templates" ON look_templates
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_looks_user_id ON looks(user_id);
CREATE INDEX IF NOT EXISTS idx_looks_public ON looks(is_public, published_at) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_looks_tags ON looks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_look_items_look_id ON look_items(look_id);
CREATE INDEX IF NOT EXISTS idx_look_votes_look_id ON look_votes(look_id);
CREATE INDEX IF NOT EXISTS idx_look_templates_public ON look_templates(is_public) WHERE is_public = true;

-- Trigger to update looks.updated_at
CREATE OR REPLACE FUNCTION update_looks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_looks_updated_at
  BEFORE UPDATE ON looks
  FOR EACH ROW
  EXECUTE FUNCTION update_looks_updated_at();