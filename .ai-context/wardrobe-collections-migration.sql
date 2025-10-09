-- Create wardrobe collections table for organizing wardrobe items
CREATE TABLE IF NOT EXISTS public.wardrobe_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wardrobe_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wardrobe_collections
CREATE POLICY "Users can view their own collections"
  ON public.wardrobe_collections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON public.wardrobe_collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.wardrobe_collections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.wardrobe_collections
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public collections"
  ON public.wardrobe_collections
  FOR SELECT
  USING (is_public = true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wardrobe_collections_user_id ON public.wardrobe_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_collections_is_public ON public.wardrobe_collections(is_public);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_wardrobe_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wardrobe_collections_updated_at
  BEFORE UPDATE ON public.wardrobe_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_wardrobe_collections_updated_at();
