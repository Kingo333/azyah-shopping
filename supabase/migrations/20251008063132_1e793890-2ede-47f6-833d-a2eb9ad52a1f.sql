-- Create wardrobe_items table
CREATE TABLE public.wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_bg_removed_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('top', 'bottom', 'shoes', 'accessory', 'jewelry', 'bag')),
  color TEXT,
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  brand TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create outfits table
CREATE TABLE public.outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_data JSONB NOT NULL DEFAULT '{}',
  occasion TEXT,
  name TEXT,
  image_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wardrobe_items
CREATE POLICY "Users can view their own wardrobe items"
  ON public.wardrobe_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wardrobe items"
  ON public.wardrobe_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wardrobe items"
  ON public.wardrobe_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wardrobe items"
  ON public.wardrobe_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for outfits
CREATE POLICY "Users can view their own outfits"
  ON public.outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits"
  ON public.outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits"
  ON public.outfits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits"
  ON public.outfits FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload their own wardrobe images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wardrobe' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own wardrobe images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'wardrobe' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own wardrobe images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wardrobe' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Drop old closet tables (after creating new ones)
DROP TABLE IF EXISTS public.closet_items CASCADE;
DROP TABLE IF EXISTS public.closet_ratings CASCADE;
DROP TABLE IF EXISTS public.closets CASCADE;