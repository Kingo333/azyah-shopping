-- Phase 1: Foundation - Dress Me Complete Implementation

-- 1) Add new columns to wardrobe_items (extend existing table)
ALTER TABLE public.wardrobe_items 
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('upload','web_import','community_copy')) DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS public_reuse_permitted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attribution_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS thumb_path text;

-- 2) Rename outfits table to fits and add new columns
-- First create the new fits table with all required columns
CREATE TABLE IF NOT EXISTS public.fits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  canvas_json jsonb NOT NULL DEFAULT '{}',
  render_path text,
  is_public boolean DEFAULT false,
  like_count int NOT NULL DEFAULT 0,
  occasion text,
  name text,
  outfit_data jsonb,
  image_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migrate data from outfits to fits if outfits table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'outfits') THEN
    INSERT INTO public.fits (id, user_id, title, outfit_data, occasion, name, image_preview, created_at, canvas_json)
    SELECT id, user_id, name, outfit_data, occasion, name, image_preview, created_at, outfit_data
    FROM public.outfits;
    
    -- Drop old table
    DROP TABLE public.outfits CASCADE;
  END IF;
END $$;

-- 3) Create fit_items junction table (layers with transforms)
CREATE TABLE IF NOT EXISTS public.fit_items (
  fit_id uuid NOT NULL REFERENCES public.fits(id) ON DELETE CASCADE,
  wardrobe_item_id uuid NOT NULL REFERENCES public.wardrobe_items(id) ON DELETE RESTRICT,
  z_index int NOT NULL,
  transform jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "scale": 1.0, "rotation": 0}',
  PRIMARY KEY (fit_id, wardrobe_item_id)
);

-- 4) Create community_flags table (moderation)
CREATE TABLE IF NOT EXISTS public.community_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text CHECK (target_type IN ('fit','wardrobe_item')) NOT NULL,
  target_id uuid NOT NULL,
  reason text,
  status text CHECK (status IN ('open','reviewed','removed')) DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wardrobe_items (updated)
DROP POLICY IF EXISTS "Users can view their own wardrobe items" ON public.wardrobe_items;
DROP POLICY IF EXISTS "Users can insert their own wardrobe items" ON public.wardrobe_items;
DROP POLICY IF EXISTS "Users can update their own wardrobe items" ON public.wardrobe_items;
DROP POLICY IF EXISTS "Users can delete their own wardrobe items" ON public.wardrobe_items;

CREATE POLICY "wardrobe_items_select_owner_or_public"
ON public.wardrobe_items
FOR SELECT
USING (auth.uid() = user_id OR public_reuse_permitted = true);

CREATE POLICY "wardrobe_items_modify_owner_only"
ON public.wardrobe_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for fits
CREATE POLICY "fits_select_owner_or_public"
ON public.fits
FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "fits_modify_owner_only"
ON public.fits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for fit_items
CREATE POLICY "fit_items_select_by_fit_visibility"
ON public.fit_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.fits f
    WHERE f.id = fit_items.fit_id
      AND (f.user_id = auth.uid() OR f.is_public = true)
  )
);

CREATE POLICY "fit_items_modify_owner_only"
ON public.fit_items
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.fits f WHERE f.id = fit_items.fit_id AND f.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.fits f WHERE f.id = fit_items.fit_id AND f.user_id = auth.uid())
);

-- RLS Policies for community_flags
CREATE POLICY "flags_insert_authenticated"
ON public.community_flags
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_category ON public.wardrobe_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_public_reuse ON public.wardrobe_items(public_reuse_permitted) WHERE public_reuse_permitted = true;
CREATE INDEX IF NOT EXISTS idx_fits_user_id ON public.fits(user_id);
CREATE INDEX IF NOT EXISTS idx_fits_public ON public.fits(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_fit_items_fit_id ON public.fit_items(fit_id);

-- Storage Bucket Policies (for closet-thumbs, fits-renders, backgrounds)
-- Note: Buckets must be created via UI or storage API first

-- Closet thumbs policies
CREATE POLICY "Users can upload their own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'closet-thumbs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own thumbnails"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'closet-thumbs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fits renders policies (public)
CREATE POLICY "Anyone can view fit renders"
ON storage.objects FOR SELECT
USING (bucket_id = 'fits-renders');

CREATE POLICY "Users can upload fit renders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fits-renders' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Backgrounds policies (public)
CREATE POLICY "Anyone can view backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'backgrounds');